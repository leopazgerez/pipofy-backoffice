import { Reservation, ReservationDraft } from '../entities/reservation';

/**
 * El ciclo de vida de una reserva: se toma el cupo (hold), y después se confirma o se cancela.
 *
 * `reserve` pega a `/class-sessions/:id/reservations` y aun así vive acá y no en
 * ClassSessionsRepository: el contrato se corta por CONCEPTO, y los tres pasos son el mismo
 * recorrido que hace la pantalla.
 *
 * DESVÍO CONSCIENTE de "las escrituras devuelven void": `reserve` devuelve la Reservation.
 * No existe `GET /reservations`, así que la respuesta de este POST es el único lugar del que
 * el front puede sacar el id — y sin id no hay confirm ni cancel posibles.
 *
 * OJO con `confirm`: el backend exige que la reserva tenga un plan con créditos. Si no, 409
 * 'Requiere pago manual' y no hay salida, porque confirm-payment pide un paymentMethodId que
 * ningún catálogo expone. Por eso `createReservationDraft` no deja armar un draft sin plan.
 */
export abstract class ReservationsRepository {
  abstract reserve(draft: ReservationDraft): Promise<Reservation>;
  abstract confirm(id: string): Promise<void>;
  abstract cancel(id: string): Promise<void>;
}
