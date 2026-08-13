import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { Student, studentDisplayName } from '@domain/entities/student';
import { StudentPlan } from '@domain/entities/student-plan';
import { domainErrorMessage } from '@domain/errors';
import { AlumnoPlanesFacade } from './alumno-planes.facade';

/**
 * Planes y créditos de un alumno. Se carga al ABRIR y no con la tabla: un pedido por alumno
 * en la lista sería un N+1 contra `/students/:id/plans`, que es el único endpoint que hay.
 *
 * Sólo lectura. La compra (`POST /students/:id/plans`) pide un `paymentMethodId` y la API no
 * expone el catálogo de métodos de pago, así que el formulario no se puede armar todavía.
 */
@Component({
  selector: 'app-alumno-planes-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal #modal title="Planes y créditos" [subtitle]="nombre()" icon="primary">
      @if (errorText()) {
        <p class="notice hold form-error" role="alert">{{ errorText() }}</p>
      } @else if (facade.loading()) {
        <p role="status">Cargando planes…</p>
      } @else {
        <p class="creditos" data-test="creditos-totales">
          <strong>{{ facade.credits() }}</strong> créditos disponibles hoy
        </p>

        @if (planes().length === 0) {
          <p class="hint">Este alumno todavía no compró ningún plan.</p>
        } @else {
          <table class="tabla">
            <thead>
              <tr><th>Plan</th><th>Comprado</th><th>Créditos</th><th>Vence</th></tr>
            </thead>
            <tbody>
              @for (plan of planes(); track plan.id) {
                <tr>
                  <td>{{ facade.planName(plan.planId) }}</td>
                  <td>{{ plan.purchasedAt ?? '—' }}</td>
                  <td>{{ plan.creditsRemaining ?? 0 }} / {{ plan.creditsTotal ?? 0 }}</td>
                  <td>
                    @if (plan.expiresAt === null) {
                      No vence
                    } @else if (facade.isUsable(plan)) {
                      {{ plan.expiresAt }}
                    } @else {
                      <span class="vencido">Vencido {{ plan.expiresAt }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      }
    </app-modal>
  `,
  styles: [`
    .creditos{font-size:var(--text-md);margin-bottom:var(--space-md)}
    .creditos strong{font-size:var(--text-xl);color:var(--color-primary)}
    .tabla{width:100%;border-collapse:collapse;font-size:var(--text-sm)}
    .tabla th{text-align:left;font-weight:600;color:var(--color-fg-muted);padding:6px 8px;border-bottom:1px solid var(--color-border)}
    .tabla td{padding:8px;border-bottom:1px solid var(--color-border)}
    .vencido{color:var(--color-destructive);font-weight:600}
  `],
})
export class AlumnoPlanesModalComponent {
  protected readonly facade = inject(AlumnoPlanesFacade);
  private readonly modal = viewChild.required(ModalComponent);

  private readonly student = signal<Student | null>(null);

  protected nombre(): string {
    const s = this.student();
    return s ? studentDisplayName(s) : '';
  }

  protected planes(): readonly StudentPlan[] {
    return this.facade.data() ?? [];
  }

  protected errorText(): string {
    const err = this.facade.error();
    return err ? domainErrorMessage(err) : '';
  }

  async open(student: Student): Promise<void> {
    this.student.set(student);
    this.modal().open();
    await this.facade.load(student.id);
  }

  close(): void {
    this.modal().close();
  }
}
