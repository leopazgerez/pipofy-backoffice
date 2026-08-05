import { ChangeDetectionStrategy, Component, computed, input, output, signal, viewChild } from '@angular/core';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { AttendanceMark, Group, GroupSession } from '@domain/entities/group';
import { creditsToDiscount } from '@domain/use-cases/apply-attendance.use-case';

export interface AttendanceTarget {
  readonly group: Group;
  readonly session: GroupSession;
}

export interface AttendanceResult {
  readonly marks: readonly AttendanceMark[];
  readonly discountAbsences: boolean;
}

/**
 * Modal de toma de asistencia. Origen: index-v2.html:1352-1371 + openAttendance() 2107-2176.
 *
 * DOS MODOS DERIVADOS DE session.status, no de un flag que reciba: 'scheduled' → tomar
 * (descuenta créditos), 'completed' → editar (sólo marcas). Un booleano que viaje desde acá
 * hasta el dominio se puede mentir, y descontar dos veces es el peor bug de esta pantalla.
 *
 * SIN flow-steps: el modal de cancelar del dashboard los tiene porque la maqueta se los dibujó;
 * éste no.
 */
@Component({
  selector: 'app-attendance-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './attendance-modal.component.css',
  template: `
    <app-modal #modal icon="primary" [title]="title()" [subtitle]="subtitle()">
      <svg modal-icon width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="3.5" y="4.5" width="17" height="16" rx="2" stroke="currentColor" stroke-width="1.7"/>
        <path d="M3.5 9h17" stroke="currentColor" stroke-width="1.7"/>
      </svg>

      @if (taking()) {
        <label class="att-policy">
          <input type="checkbox" [checked]="discountAbsences()" (change)="onPolicy($event)">
          <div>
            <div class="ap-t">Descontar crédito por inasistencia</div>
            <div class="ap-d">Política del club: el ausente también consume 1 clase</div>
          </div>
        </label>
      }

      <div class="att-list">
        @for (m of target().group.roster; track m.id) {
          <div class="att-row">
            <div class="att-who">
              <span class="avatar-sm" aria-hidden="true">{{ m.initials }}</span>
              <div>{{ m.name }}<div class="sub">{{ m.category }} · {{ m.credits }} créd.</div></div>
            </div>
            <div class="segpick" role="group" [attr.aria-label]="'Asistencia de ' + m.name">
              <button type="button" class="segp" [class.on-p]="isPresent(m.id)"
                      [attr.aria-pressed]="isPresent(m.id)" (click)="mark(m.id, true)">Presente</button>
              <button type="button" class="segp" [class.on-a]="!isPresent(m.id)"
                      [attr.aria-pressed]="!isPresent(m.id)" (click)="mark(m.id, false)">Ausente</button>
            </div>
          </div>
        }
      </div>

      <div class="att-summary" aria-live="polite">
        <span class="sp">Presentes <b>{{ present() }}</b></span>
        <span class="sa">Ausentes <b>{{ absent() }}</b></span>
        @if (taking()) { <span class="sc">Clases a computar <b>{{ computable() }}</b></span> }
      </div>

      @if (taking()) {
        <!-- La maqueta (index-v2.html:1365) dice "…en el credit_ledger del alumno". El ledger es
             del slice de Alumnos: acá ese texto sería FALSO. -->
        <div class="notice ok">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="notice-ic">
            <path d="M5 12l5 5 9-11" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Cada presente descuenta <b>1 crédito</b> del grupo. Con la política activa, el ausente también.</span>
        </div>
      }

      <div class="modal-foot" modal-foot>
        <!-- eslint-disable-next-line @angular-eslint/template/no-autofocus -- requerido por el contrato de ModalComponent: showModal() sólo autoenfoca un elemento con el atributo HTML 'autofocus'; sin él, el dialog nativo se autoenfoca a sí mismo y el foco no llega a ningún control (modal.component.ts). Va en Cancelar y no en el primer control porque el primer control cambia con el modo (el checkbox de política sólo existe al tomar) y porque un Enter reflejo sobre el foco inicial tiene que ser inocuo, nunca la escritura. -->
        <button type="button" class="btn btn-ghost" autofocus (click)="close()">Cancelar</button>
        <button type="button" class="btn btn-primary" data-testid="confirm"
                [disabled]="saving()" [class.loading]="saving()" (click)="confirm()">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12l5 5 9-11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ taking() ? 'Confirmar asistencia' : 'Guardar cambios' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class AttendanceModalComponent {
  readonly target = input.required<AttendanceTarget>();
  /** El modal NO toca la facade: la página cablea y le informa el desenlace. */
  readonly confirmed = output<AttendanceResult>();

  protected readonly marks = signal<Record<string, boolean>>({});
  protected readonly discountAbsences = signal(true);
  protected readonly saving = signal(false);

  private readonly modal = viewChild.required(ModalComponent);

  protected readonly taking = computed(() => this.target().session.status === 'scheduled');
  protected readonly title = computed(() => (this.taking() ? 'Tomar asistencia' : 'Editar asistencia'));
  protected readonly subtitle = computed(() => {
    const { group, session } = this.target();
    return `${group.name} · ${session.date} ${session.time} · ${session.courtName}`;
  });

  /** Marcas reconciladas contra el roster ACTUAL: es lo que se emite y lo que cuenta el resumen. */
  protected readonly markList = computed<AttendanceMark[]>(() =>
    this.target().group.roster.map((m) => ({ memberId: m.id, present: this.isPresent(m.id) })),
  );
  protected readonly present = computed(() => this.markList().filter((m) => m.present).length);
  protected readonly absent = computed(() => this.markList().length - this.present());
  protected readonly computable = computed(() => creditsToDiscount(this.markList(), this.discountAbsences()));

  /**
   * Siembra IMPERATIVA, nunca con un effect/computed sobre el input de la sesión.
   *
   * saveAttendance hace setData() con un snapshot nuevo, así que TODO effect sobre los datos se
   * dispara con cada escritura y pisaría lo que el usuario está editando. Es la misma razón por la
   * que la siembra de holds del dashboard va encadenada al load() y no a un effect
   * (dashboard-page.component.ts:41-54). Además abre en limpio: reabrir tras un fallo no debe
   * mostrar el estado viejo.
   */
  open(): void {
    const { group, session } = this.target();
    const guardadas = new Map((session.attendance ?? []).map((m) => [m.memberId, m.present]));
    // El integrante sin marca guardada arranca PRESENTE (roster que creció después de la toma).
    this.marks.set(Object.fromEntries(group.roster.map((m) => [m.id, guardadas.get(m.id) ?? true])));
    this.discountAbsences.set(true);
    this.saving.set(false);
    this.modal().open();
  }

  close(): void { this.modal().close(); }

  /** La página avisa que salió bien: se cierra. */
  markDone(): void { this.close(); }

  /** La página avisa que falló: el modal QUEDA ABIERTO y el botón vuelve a estar disponible. */
  markFailed(): void { this.saving.set(false); }

  protected isPresent(memberId: string): boolean {
    return this.marks()[memberId] ?? true;
  }

  protected mark(memberId: string, present: boolean): void {
    this.marks.update((m) => ({ ...m, [memberId]: present }));
  }

  protected onPolicy(e: Event): void {
    this.discountAbsences.set((e.target as HTMLInputElement).checked);
  }

  protected confirm(): void {
    // GUARD DE DOBLE-SUBMIT EN CÓDIGO. `.btn.loading` es sólo pointer-events:none
    // (styles/components.css:55) y NO impide la activación por teclado: un botón enfocado sigue
    // disparando click con Enter. Sin este guard, dos Enter seguidos son dos saveAttendance en
    // vuelo. El [disabled] del template es el segundo freno; éste es el primero.
    if (this.saving()) return;
    this.saving.set(true);
    this.confirmed.emit({ marks: this.markList(), discountAbsences: this.discountAbsences() });
  }
}
