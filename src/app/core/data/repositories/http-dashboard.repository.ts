import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { DashboardSnapshot } from '@domain/entities/dashboard-snapshot';
import {
  ClassSessionDto,
  ClassSessionListDtoSchema,
  WaitingListDtoSchema,
} from '../dto/class-session.dto';
import { isOnLocalDate, localDateKey, toDashboardSnapshot } from '../mappers/dashboard.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';
import { CatalogsRepository } from './catalogs.repository';

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * No hay endpoint agregador: este repositorio COMPONE el snapshot desde cinco llamadas en
 * paralelo, cuatro de ellas reusando repositorios que ya existen con su mapper y sus tests.
 *
 * Si cualquiera de las cinco falla, falla el snapshot entero: un dashboard con la grilla a
 * medias es peor que un mensaje de error. La lista de espera es la excepción — es
 * información secundaria y degrada a 'full' en vez de tumbar la pantalla.
 */
// `extends` y no `implements`, igual que el resto de los repos HTTP: así la clase satisface
// el token DI por sí sola y no depende de que el provider lo deletree con `useClass`.
@Injectable()
export class HttpDashboardRepository extends DashboardRepository {
  private readonly api = inject(ApiClient);
  private readonly courts = inject(CourtsRepository);
  private readonly coaches = inject(CoachesRepository);
  private readonly categoryGroups = inject(CategoryGroupsRepository);
  private readonly catalogs = inject(CatalogsRepository);

  async getSnapshot(clubId: string): Promise<DashboardSnapshot> {
    try {
      const today = new Date();
      // La lista de espera depende SÓLO de las sesiones, no de las otras cuatro llamadas.
      // Encadenarla acá la larga apenas responde /class-sessions, en vez de esperar a la más
      // lenta de la ola: con /coaches tardando 400 ms y /class-sessions 40 ms, esperar la ola
      // entera le sumaba esos 400 ms de latencia a cada carga.
      const sessionsPromise = this.fetchSessions(today);
      const waitingPromise = sessionsPromise.then((s) => this.fetchWaitingCounts(s, today));
      const [courts, coaches, categoryGroups, surfaceTypes, sessions, waitingCounts] =
        await Promise.all([
          this.courts.list(),
          this.coaches.list(),
          this.categoryGroups.list(),
          this.catalogs.surfaceTypes(),
          sessionsPromise,
          waitingPromise,
        ]);
      return toDashboardSnapshot({
        clubId,
        courts,
        coaches,
        categoryGroups,
        surfaceTypes,
        sessions,
        waitingCounts,
        today,
      });
    } catch (err) {
      throw toDomainError(err);
    }
  }

  /**
   * `class-sessions.service.list()` construye la ventana con `new Date(from + 'T00:00:00Z')`:
   * la Z es literal, así que interpreta las fechas en UTC y no en la zona del club. Pedir
   * sólo "hoy" desde Argentina pierde las clases de 21:00 a 23:59 — prime time. Se pide un
   * día de más de cada lado y el mapper filtra por fecha local exacta.
   */
  private async fetchSessions(today: Date): Promise<ClassSessionDto[]> {
    const from = localDateKey(addDays(today, -1));
    const to = localDateKey(addDays(today, 1));
    const raw = await firstValueFrom(
      this.api.get<unknown>(`/class-sessions?from=${from}&to=${to}`),
    );
    return v.parse(ClassSessionListDtoSchema, raw);
  }

  /**
   * Sólo las sesiones llenas DE HOY: `sessions` trae ±1 día porque `fetchSessions` pide esa
   * ventana (ver su comentario), y una sesión de ayer o mañana ni siquiera va a entrar a la
   * grilla — consultarla es puro gasto. Una sesión con cupo tampoco puede tener lista de
   * espera con sentido, así que ambos filtros aplican.
   *
   * ponytail: N+1 acotado a las sesiones llenas del día. Es el precio de no tener endpoint
   * agregador ni un contador embebido en /class-sessions, y ninguna de las dos se puede
   * hacer sin tocar el backend (spec §10.7).
   */
  private async fetchWaitingCounts(
    sessions: readonly ClassSessionDto[],
    today: Date,
  ): Promise<ReadonlyMap<string, number>> {
    const todayKey = localDateKey(today);
    const full = sessions.filter(
      (s) => s.availableSpots === 0 && isOnLocalDate(s.startAt, todayKey),
    );
    const entries = await Promise.all(
      full.map(async (s): Promise<readonly [string, number]> => {
        try {
          const raw = await firstValueFrom(
            this.api.get<unknown>(`/class-sessions/${s.id}/waiting-list`),
          );
          return [s.id, v.parse(WaitingListDtoSchema, raw).length];
        } catch {
          console.warn(`[dashboard] no se pudo leer la lista de espera de la sesión ${s.id}`);
          return [s.id, 0];
        }
      }),
    );
    return new Map(entries);
  }
}
