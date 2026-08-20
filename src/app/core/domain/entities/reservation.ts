import { InvalidReservationError } from '../errors';

/**
 * Lo que devuelve `POST /class-sessions/:id/reservations`, recortado a lo que el front no
 * puede saber por su cuenta.
 *
 * Dos campos y no doce a propósito: el alumno y la clase ya los tiene la pantalla en memoria.
 * Lo único que sólo la API sabe es el id de la reserva —imprescindible, porque NO existe
 * `GET /reservations` y este es el único momento en que el front lo ve— y hasta cuándo vive
 * el hold.
 */
export interface Reservation {
  readonly id: string;
  readonly holdExpiresAt: string | null;
}

/** Lo que sale de los selects del modal: vacío es '', no null. */
export interface ReservationInput {
  readonly sessionId: string;
  readonly studentId: string;
  readonly studentPlanId: string;
}

export interface ReservationDraft {
  readonly sessionId: string;
  readonly studentId: string;
  readonly studentPlanId: string;
}

/**
 * El plan es OBLIGATORIO, y no es una preferencia de UI.
 *
 * `ReservationsService.confirm()` exige que la reserva tenga un plan con créditos; sin eso
 * responde 409 'Requiere pago manual, usar /reservations/:id/confirm-payment', y ese endpoint
 * está bloqueado porque pide un `paymentMethodId` que ningún catálogo de la API expone.
 * Reservar sin plan es fabricar un cupo tomado que nadie puede confirmar y que se evapora
 * solo en 30 minutos.
 *
 * El modal ya deshabilita el botón; la entidad no confía en la UI.
 *
 * ponytail: exigir plan es la salida corta a que `confirm-payment` esté bloqueado. Techo: un
 * alumno sin plan vigente no se puede anotar aunque pague en el mostrador. Salida real:
 * `GET /catalogs/payment-methods` en el backend habilita `confirm-payment`.
 */
export function createReservationDraft(input: ReservationInput): ReservationDraft {
  if (!input.studentId) {
    throw new InvalidReservationError('Elegí un alumno.');
  }
  if (!input.studentPlanId) {
    throw new InvalidReservationError(
      'Elegí un plan con créditos: sin plan la reserva no se puede confirmar.',
    );
  }
  return {
    sessionId: input.sessionId,
    studentId: input.studentId,
    studentPlanId: input.studentPlanId,
  };
}
