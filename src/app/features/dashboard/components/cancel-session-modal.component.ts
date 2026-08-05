import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { CancelReason, CourtSession } from '@domain/entities/dashboard-snapshot';

export interface CancelTarget {
  readonly session: CourtSession;
  readonly courtName: string;
  readonly hour: string;
}

interface FlowStep {
  readonly title: string;
  readonly detail: string;
}

type FlowState = 'idle' | 'running' | 'failed';

/**
 * Los pasos son DATA-DRIVEN y hoy hay UNO SOLO, el único que es real.
 *
 * La maqueta muestra 3 (index-v2.html:1243-1245), pero el 2 (devolver crédito) y el
 * 3 (ofrecer a lista de espera) dependen de dominios DIFERIDOS (credit_ledger,
 * waitlist — pertenecen a los slices de Alumnos y Grupos). Mostrarlos sería
 * mentirle al usuario.
 *
 * PARA EXTENDER: cuando el slice de Alumnos aterrice su dominio, agrega su FlowStep
 * ACÁ y actualiza los textos del intro y del toast en la misma tanda. Nunca pasos
 * falsos. Ver el spec §9.6 y §9.7.
 */
const STEPS: readonly FlowStep[] = [
  { title: 'Liberando cupo', detail: 'El cupo queda disponible en la grilla' },
];

/** Tabla texto→valor del motivo. El value es el CancelReason del dominio. */
const REASONS: readonly { value: CancelReason; label: string }[] = [
  { value: 'profesor',   label: 'Profesor no disponible' },
  { value: 'lluvia',     label: 'Lluvia / cancha inhabilitada' },
  { value: 'incompleto', label: 'Grupo incompleto' },
  { value: 'otro',       label: 'Otro' },
];

@Component({
  selector: 'app-cancel-session-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cancel-session-modal.component.css',
  template: `
    <app-modal #modal icon="danger" [title]="title()" [subtitle]="subtitle()" (closed)="onClosed()">
      <svg modal-icon width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 8v5M12 16.5v.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M10.3 3.9L2.7 17a2 2 0 001.7 3h15.2a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" stroke="currentColor" stroke-width="1.7"/>
      </svg>

      @if (flow() === 'idle') {
        <p class="cancel-intro-lead">Confirmá el motivo para liberar el cupo de esta sesión.</p>
        <div class="field field-dense">
          <label for="cancel-reason">Motivo de cancelación <span class="req" aria-hidden="true">*</span></label>
          <!-- eslint-disable-next-line @angular-eslint/template/no-autofocus -- requerido por el contrato de ModalComponent: showModal() sólo autoenfoca un elemento con el atributo HTML 'autofocus'; sin él, el dialog nativo se autoenfoca a sí mismo y el foco no llega al primer control (modal.component.ts) -->
          <select id="cancel-reason" required autofocus [value]="reason()" (change)="onReason($event)">
            <!-- La maqueta (index-v2.html:1238) NO tiene opción en blanco, así que el navegador
                 auto-selecciona la primera y el estado "sin motivo" nunca ocurre — \`required\`
                 sería decorativo. Con el placeholder, es real. Desviación deliberada (spec §9.5). -->
            <option value="" disabled selected>Elegí un motivo…</option>
            @for (r of reasons; track r.value) {
              <option [value]="r.value">{{ r.label }}</option>
            }
          </select>
        </div>
        <div class="notice hold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="flex:0 0 auto;margin-top:1px">
            <path d="M12 8v4.5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/>
          </svg>
          <!-- TEXTO HONESTO: la maqueta prometía "+1 crédito de devolución" y "oferta a lista de
               espera", que son exactamente los dos dominios diferidos. Ver el spec §9.6. -->
          <span>Al cancelar, el cupo queda disponible en la grilla.</span>
        </div>
      } @else {
        <div aria-live="polite">
          @for (s of steps; track s.title; let i = $index) {
            <div class="flow-step" [class.active]="flow() === 'running'" [class.failed]="flow() === 'failed'">
              <span class="fs-ic" aria-hidden="true">{{ i + 1 }}</span>
              <div class="fs-body">
                <div class="fs-t">{{ s.title }}</div>
                <div class="fs-d">{{ flow() === 'failed' ? 'No se pudo completar' : s.detail }}</div>
              </div>
              <span class="spin" aria-hidden="true"></span>
            </div>
          }
        </div>
      }

      <div class="modal-foot" modal-foot [hidden]="flow() === 'running'">
        <button type="button" class="btn btn-ghost" (click)="close()">Volver</button>
        <button type="button" class="btn btn-danger" data-testid="confirm" [disabled]="!reason()" (click)="confirm()">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Cancelar y liberar
        </button>
      </div>
    </app-modal>
  `,
})
export class CancelSessionModalComponent {
  readonly target = input.required<CancelTarget>();

  /** Emite el motivo elegido. El modal NO toca la facade: la página cablea y le informa el desenlace. */
  readonly confirmed = output<CancelReason>();

  protected readonly reasons = REASONS;
  protected readonly steps = STEPS;
  protected readonly reason = signal<CancelReason | ''>('');
  protected readonly flow = signal<FlowState>('idle');

  private readonly modal = viewChild.required(ModalComponent);

  protected readonly title = computed(() => `Cancelar sesión · ${this.target().session.category}`);
  /** Formato de index-v2.html:1975, separador " · ". */
  protected readonly subtitle = computed(() => {
    const t = this.target();
    return `${t.session.category} · ${t.courtName} · ${t.hour} · ${t.session.professor}`;
  });

  /** Abre en limpio: reabrir después de un fallo no debe mostrar el estado viejo. */
  open(): void {
    this.reason.set('');
    this.flow.set('idle');
    this.modal().open();
  }

  close(): void { this.modal().close(); }

  /** La página avisa que la cancelación salió bien: se cierra. */
  markDone(): void { this.close(); }

  /**
   * La página avisa que falló. El paso queda en .failed (el spinner para), el pie
   * reaparece para reintentar o volver, y el modal NO se cierra: el usuario ve qué falló.
   */
  markFailed(): void { this.flow.set('failed'); }

  protected onReason(e: Event): void {
    this.reason.set((e.target as HTMLSelectElement).value as CancelReason | '');
  }

  protected confirm(): void {
    const r = this.reason();
    if (!r || this.flow() === 'running') return;
    // El pie se oculta con [hidden]="flow()==='running'" → misma protección de doble-submit
    // que la maqueta (index-v2.html:1985), que ocultaba el pie entero.
    this.flow.set('running');
    this.confirmed.emit(r);
  }

  protected onClosed(): void {
    // Cerrado por Esc / X / backdrop en pleno vuelo: volvemos a idle para la próxima apertura.
    if (this.flow() !== 'running') this.flow.set('idle');
  }
}
