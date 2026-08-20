import { Injectable, inject, signal } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ReservationsRepository } from '@domain/contracts/reservations.repository';
import {
  Reservation,
  ReservationInput,
  createReservationDraft,
} from '@domain/entities/reservation';
import { WaitingListEntry } from '@domain/entities/waiting-list';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';
import { ReservasFacade } from './reservas.facade';

export interface PendingHold {
  readonly reservation: Reservation;
  readonly studentId: string;
}

/**
 * Lo de UNA sesión: su lista de espera (la tríada de SignalStore) y sus holds sin confirmar.
 *
 * Separada de ReservasFacade igual que AlumnoPlanesFacade de AlumnosFacade: con una sola
 * facade, abrir el modal prendería el spinner de la tabla y un error del modal taparía el de
 * la lista.
 *
 * ReservasFacade se INYECTA acá: las dos están provistas en la misma ruta, y "cancelar refresca
 * también las sesiones" es una regla del flujo, no de la pantalla. Dejarla en el componente la
 * volvía imposible de testear sin montar el modal.
 */
@Injectable()
export class SesionFacade extends SignalStore<WaitingListEntry[], DomainError> {
  private readonly sessions = inject(ClassSessionsRepository);
  private readonly reservations = inject(ReservationsRepository);
  private readonly reservas = inject(ReservasFacade);

  /**
   * sessionId → holds creados en ESTA visita.
   *
   * ponytail: en memoria. Vive en la facade, que está provista en la ruta, así que cerrar y
   * reabrir el modal no los pierde; salir de /reservas sí. Techo aceptado a conciencia: no
   * existe `GET /reservations`, así que un hold sin confirmar es invisible después de un F5
   * aunque siga vivo en la base. Salida: `GET /reservations?status=held` en el backend.
   */
  private readonly _holds = signal<ReadonlyMap<string, readonly PendingHold[]>>(new Map());

  holdsOf(sessionId: string): readonly PendingHold[] {
    return this._holds().get(sessionId) ?? [];
  }

  open(sessionId: string): Promise<void> {
    return this.run(this.sessions.waitingList(sessionId), toDomainError);
  }

  clearError(): void {
    this.setError(null);
  }

  /**
   * createReservationDraft tira de forma síncrona sin alumno o sin plan; va DENTRO de la
   * promesa para que run()/toDomainError normalicen la invariante igual que un fallo del repo.
   * Mismo patrón que CanchasFacade.create().
   *
   * Resuelve a `this.data()`: reservar no cambia la lista de espera, y releerla sería un GET
   * al pedo. run() necesita un valor para su tríada, así que se le devuelve el que ya tiene.
   */
  reservar(sessionId: string, input: ReservationInput): Promise<void> {
    return this.run(
      Promise.resolve()
        .then(() => this.reservations.reserve(createReservationDraft(input)))
        .then((reservation) =>
          this.pushHold(sessionId, { reservation, studentId: input.studentId }),
        )
        .then(() => this.reservas.load())
        .then(() => this.data() ?? []),
      toDomainError,
    );
  }

  confirmar(sessionId: string, reservationId: string): Promise<void> {
    return this.run(
      this.reservations
        .confirm(reservationId)
        .then(() => this.dropHold(sessionId, reservationId))
        .then(() => this.reservas.load())
        .then(() => this.data() ?? []),
      toDomainError,
    );
  }

  /**
   * Cancelar refresca DOS cosas. `ReservationsService.cancel()` promueve al primero de la
   * lista de espera creando un hold nuevo y marcando su anotación como 'notificado': la lista
   * se acortó sola, sin que el usuario haya tocado ese bloque.
   *
   * Las dos lecturas son independientes entre sí —sólo dependen de que el cancel haya
   * entrado—, así que van en paralelo: encadenadas, el modal esperaba la suma de los dos
   * viajes en vez del más lento.
   */
  cancelar(sessionId: string, reservationId: string): Promise<void> {
    return this.run(
      this.reservations
        .cancel(reservationId)
        .then(() => this.dropHold(sessionId, reservationId))
        .then(() =>
          Promise.all([this.reservas.load(), this.sessions.waitingList(sessionId)]),
        )
        .then(([, waiting]) => waiting),
      toDomainError,
    );
  }

  anotar(sessionId: string, studentId: string): Promise<void> {
    return this.run(
      this.sessions
        .joinWaitingList(sessionId, studentId)
        .then(() => this.sessions.waitingList(sessionId)),
      toDomainError,
    );
  }

  quitar(sessionId: string, entryId: string): Promise<void> {
    return this.run(
      this.sessions.leaveWaitingList(entryId).then(() => this.sessions.waitingList(sessionId)),
      toDomainError,
    );
  }

  private pushHold(sessionId: string, hold: PendingHold): void {
    const next = new Map(this._holds());
    next.set(sessionId, [...this.holdsOf(sessionId), hold]);
    this._holds.set(next);
  }

  private dropHold(sessionId: string, reservationId: string): void {
    const next = new Map(this._holds());
    next.set(
      sessionId,
      this.holdsOf(sessionId).filter((h) => h.reservation.id !== reservationId),
    );
    this._holds.set(next);
  }
}
