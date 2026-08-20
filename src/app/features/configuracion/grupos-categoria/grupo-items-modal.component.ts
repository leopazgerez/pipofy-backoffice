import { ChangeDetectionStrategy, Component, inject, input, signal, viewChild } from '@angular/core';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Category } from '@domain/entities/category';
import { CategoryGroup } from '@domain/entities/category-group';
import { GrupoItemsFacade } from './grupo-items.facade';
import { domainErrorMessage } from '@domain/errors';

/**
 * Qué categorías arma este grupo. Es la pantalla que desbloquea reservar: el backend valida
 * la categoría del alumno contra los items del grupo, y sin items rechaza todo con un 400.
 *
 * El pie dice la verdad incómoda a propósito: la API no devuelve la asignación, así que esto
 * muestra lo cargado desde este navegador. Esconderlo haría que un desfase parezca un bug.
 */
@Component({
  selector: 'app-grupo-items-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal #modal title="Categorías del grupo" [subtitle]="group()?.name ?? ''" icon="primary">
      @if (errorText()) { <p class="notice hold form-error" role="alert">{{ errorText() }}</p> }

      <!-- FUERA de .field a propósito: \`.field input\` es un selector de descendencia y
           convertiría el checkbox en una caja de texto. El primitivo .checkbox-row de
           styles/components.css:134 resuelve la geometría. -->
      @for (cat of categories(); track cat.id) {
        <label class="checkbox-row" [for]="'cat-' + cat.id">
          <input
            type="checkbox"
            [id]="'cat-' + cat.id"
            [checked]="isSelected(cat.id)"
            (change)="onToggle(cat.id, $event)" />
          {{ cat.name || '(sin nombre)' }}
        </label>
      } @empty {
        <p class="a-empty">Todavía no cargaste ninguna categoría.</p>
      }

      <p class="m-sub hint">
        La API no devuelve qué categorías tiene un grupo: esta lista recuerda lo que cargaste
        desde este navegador y se corrige sola al tildar o destildar.
      </p>

      <div class="modal-foot" modal-foot>
        <button type="button" class="btn btn-ghost" (click)="close()">Cerrar</button>
      </div>
    </app-modal>
  `,
  styles: [`
    .form-error{margin-bottom:var(--space-md)}
    .hint{margin-top:var(--space-md)}
  `],
})
export class GrupoItemsModalComponent {
  readonly categories = input.required<readonly Category[]>();

  protected readonly facade = inject(GrupoItemsFacade);
  private readonly modal = viewChild.required(ModalComponent);

  /** Sólo para el subtítulo. Lo pone open() por parámetro, igual que el form modal. */
  protected readonly group = signal<CategoryGroup | null>(null);

  open(group: CategoryGroup): void {
    this.group.set(group);
    this.facade.open(group.id);
    this.modal().open();
  }

  close(): void {
    this.modal().close();
  }

  protected isSelected(categoryId: string): boolean {
    return this.facade.selected().includes(categoryId);
  }

  protected errorText(): string {
    const err = this.facade.error();
    return err ? domainErrorMessage(err) : '';
  }

  protected onToggle(categoryId: string, e: Event): void {
    void this.facade.toggle(categoryId, (e.target as HTMLInputElement).checked);
  }
}
