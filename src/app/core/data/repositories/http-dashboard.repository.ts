import { Injectable, inject } from '@angular/core';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ClassSession } from '@domain/entities/class-session';
import { DashboardSnapshot } from '@domain/entities/dashboard-snapshot';
import { localDateKey } from '@domain/local-date';
import { toDashboardSnapshot } from '../mappers/dashboard.mapper';
import { toDomainError } from '../http/to-domain-error';
import { CatalogsRepository } from './catalogs.repository';

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
  private readonly courts = inject(CourtsRepository);
  private readonly coaches = inject(CoachesRepository);
  private readonly categoryGroups = inject(CategoryGroupsRepository);
  private readonly catalogs = inject(CatalogsRepository);
  private readonly classSessions = inject(ClassSessionsRepository);

  async getSnapshot(clubId: string): Promise<DashboardSnapshot> {
    try {
      const today = new Date();
      const todayKey = localDateKey(today);
      // La lista de espera depende SÓLO de las sesiones. Encadenarla acá la larga apenas
      // responde /class-sessions en vez de esperar a la más lenta de la ola: con /coaches
      // tardando 400 ms, esperar la ola entera le sumaba esos 400 ms a cada carga.
      const sessionsPromise = this.classSessions.list(todayKey);
      const waitingPromise = sessionsPromise.then((s) => this.fetchWaitingCounts(s));
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
      });
    } catch (err) {
      throw toDomainError(err);
    }
  }

  /**
   * Sólo las sesiones LLENAS: una con cupo no puede tener lista de espera con sentido. Ya no
   * hace falta filtrar por fecha — `list(todayKey)` devuelve exactamente el día pedido.
   *
   * ponytail: N+1 acotado a las sesiones llenas del día. Es el precio de no tener endpoint
   * agregador ni un contador embebido en /class-sessions, y ninguna de las dos se puede hacer
   * sin tocar el backend.
   */
  private async fetchWaitingCounts(
    sessions: readonly ClassSession[],
  ): Promise<ReadonlyMap<string, number>> {
    const full = sessions.filter((s) => s.availableSpots === 0);
    const entries = await Promise.all(
      full.map(async (s): Promise<readonly [string, number]> => {
        try {
          return [s.id, (await this.classSessions.waitingList(s.id)).length];
        } catch {
          console.warn(`[dashboard] no se pudo leer la lista de espera de la sesión ${s.id}`);
          return [s.id, 0];
        }
      }),
    );
    return new Map(entries);
  }
}
