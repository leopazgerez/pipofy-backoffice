import { Injectable, inject, signal } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';
import { GrupoItemsStore } from './grupo-items-store';

/**
 * Las categorías de UN grupo. Separada de GruposCategoriaFacade a propósito, igual que
 * AlumnoPlanesFacade: SignalStore tiene una sola tríada data/loading/error, y con una sola
 * facade tildar una checkbox prendería el spinner de la tabla de grupos.
 *
 * `data` es la selección visible. No viene de la API — no hay GET que devuelva los items —,
 * sale de la pista del navegador y se corrige con cada escritura.
 */
@Injectable()
export class GrupoItemsFacade extends SignalStore<string[], DomainError> {
  private readonly repo = inject(CategoryGroupsRepository);
  private readonly store = inject(GrupoItemsStore);

  private readonly _groupId = signal<string | null>(null);

  selected(): readonly string[] {
    return this.data() ?? [];
  }

  open(groupId: string): void {
    this._groupId.set(groupId);
    this.setError(null);
    this.setData(this.store.read(groupId));
  }

  clearError(): void {
    this.setError(null);
  }

  /**
   * Optimista con rollback: la checkbox se pinta antes de salir a la red y vuelve atrás si la
   * API rechaza. `addItem`/`removeItem` son idempotentes por contrato, así que un 409 o un 404
   * —la pista estaba desactualizada— llegan acá como éxito y la vista termina en la verdad.
   *
   * No usa run(): run() reemplaza `data` con lo que resuelve la promesa, y acá el valor nuevo
   * se conoce ANTES de la escritura. Lo que sí se replica es su contrato: nunca rechaza, el
   * fallo queda en error().
   */
  async toggle(categoryId: string, next: boolean): Promise<void> {
    const groupId = this._groupId();
    if (groupId === null) return;

    const before = this.selected();
    const after = next
      ? [...before, categoryId]
      : before.filter((id) => id !== categoryId);

    this.setError(null);
    this.setData([...after]);
    try {
      await (next
        ? this.repo.addItem(groupId, categoryId)
        : this.repo.removeItem(groupId, categoryId));
      this.store.write(groupId, after);
    } catch (err) {
      this.setData([...before]);
      this.setError(toDomainError(err));
    }
  }
}
