import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ClassSession } from '@domain/entities/class-session';
import { WaitingListEntry } from '@domain/entities/waiting-list';
import { isOnLocalDate, localDateKey } from '@domain/local-date';
import { ClassSessionListDtoSchema, WaitingListDtoSchema } from '../dto/class-session.dto';
import { toClassSession, toWaitingListEntry } from '../mappers/class-session.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

/** 'yyyy-MM-dd' ± n días, en el calendario local. `new Date(y, m, d)` normaliza el desborde. */
function shiftDay(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return localDateKey(new Date(year, month - 1, day + days));
}

/**
 * ApiClient ya normaliza los errores HTTP a DomainError, pero v.parse tira ValiError fuera del
 * observable: el try/catch está para que las dos vías salgan normalizadas.
 */
@Injectable()
export class HttpClassSessionsRepository extends ClassSessionsRepository {
  private readonly api = inject(ApiClient);

  /**
   * `ClassSessionsService.list()` arma la ventana con new Date(`${from}T00:00:00Z`). La Z es
   * LITERAL: interpreta las fechas en UTC y no en la zona del club, así que pedir sólo "hoy"
   * desde Argentina pierde las clases de 21:00 a 23:59 — prime time. Se pide un día de más de
   * cada lado y se recorta acá con la fecha local exacta.
   *
   * El recorte vive en el repositorio y no en el consumidor a propósito: antes estaba repartido
   * entre `HttpDashboardRepository` (que pedía ±1 día) y `dashboard.mapper` (que filtraba), y
   * cualquier pantalla nueva tenía que acordarse de las dos mitades.
   */
  async list(dateKey: string): Promise<ClassSession[]> {
    try {
      const from = shiftDay(dateKey, -1);
      const to = shiftDay(dateKey, 1);
      const raw = await firstValueFrom(
        this.api.get<unknown>(`/class-sessions?from=${from}&to=${to}`),
      );
      return v
        .parse(ClassSessionListDtoSchema, raw)
        .filter((dto) => isOnLocalDate(dto.startAt, dateKey))
        .map(toClassSession);
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async waitingList(sessionId: string): Promise<WaitingListEntry[]> {
    try {
      const raw = await firstValueFrom(
        this.api.get<unknown>(`/class-sessions/${sessionId}/waiting-list`),
      );
      return v.parse(WaitingListDtoSchema, raw).map(toWaitingListEntry);
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async joinWaitingList(sessionId: string, studentId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.api.post<unknown>(`/class-sessions/${sessionId}/waiting-list`, { studentId }),
      );
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async leaveWaitingList(entryId: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete<unknown>(`/waiting-list/${entryId}`));
    } catch (err) {
      throw toDomainError(err);
    }
  }
}
