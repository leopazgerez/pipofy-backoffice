import { Injectable, computed, inject } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { Coach, CoachInput, createCoachDraft } from '@domain/entities/coach';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';

/**
 * Sin create ni remove: contra este backend un profesor no se puede crear (POST /users pide
 * un roleId y no existe GET /roles) ni borrar (no hay endpoint). §2.3.
 *
 * ponytail: save() reusa `loading`, así que la tabla muestra su spinner mientras se guarda.
 * Es aceptable porque el modal la tapa — mismo techo que las otras cinco facades con tabla.
 */
@Injectable()
export class ProfesoresFacade extends SignalStore<Coach[], DomainError> {
  private readonly repo = inject(CoachesRepository);

  /** El backend no ordena: coaches.service.list() no tiene ORDER BY (§3.1). Sin esto,
   *  editar un profesor lo manda al final de la tabla. */
  readonly sorted = computed(() => {
    const rows = this.data() ?? [];
    return [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName));
  });

  load(): Promise<void> {
    return this.run(this.repo.list(), toDomainError);
  }

  clearError(): void {
    this.setError(null);
  }

  /** createCoachDraft no tira, pero la cadena se arma igual que en las otras facades para
   *  que el fallo del repo salga normalizado por run()/toDomainError. */
  save(id: string, input: CoachInput): Promise<void> {
    return this.run(
      Promise.resolve()
        .then(() => this.repo.update(id, createCoachDraft(input)))
        .then(() => this.repo.list()),
      toDomainError,
    );
  }
}
