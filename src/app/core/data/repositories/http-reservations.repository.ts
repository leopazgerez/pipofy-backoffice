import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { ReservationsRepository } from '@domain/contracts/reservations.repository';
import { Reservation, ReservationDraft } from '@domain/entities/reservation';
import { ReservationDtoSchema } from '../dto/class-session.dto';
import { toReservation } from '../mappers/reservation.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

@Injectable()
export class HttpReservationsRepository extends ReservationsRepository {
  private readonly api = inject(ApiClient);

  /**
   * `sessionId` va en la URL y NO en el cuerpo: el ValidationPipe corre con
   * forbidNonWhitelisted, así que una clave de más devuelve 400.
   */
  async reserve(draft: ReservationDraft): Promise<Reservation> {
    try {
      const raw = await firstValueFrom(
        this.api.post<unknown>(`/class-sessions/${draft.sessionId}/reservations`, {
          studentId: draft.studentId,
          studentPlanId: draft.studentPlanId,
        }),
      );
      return toReservation(v.parse(ReservationDtoSchema, raw));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async confirm(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.post<unknown>(`/reservations/${id}/confirm`, {}));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  /**
   * Cancelar NO es sólo liberar el cupo: el backend promueve al primero de la lista de espera
   * creando un hold nuevo y marcando su anotación como 'notificado'. Quien llame a esto tiene
   * que releer también la lista de espera.
   */
  async cancel(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete<unknown>(`/reservations/${id}`));
    } catch (err) {
      throw toDomainError(err);
    }
  }
}
