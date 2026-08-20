import {
  ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal, viewChild,
} from '@angular/core';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ClassSession, occupiedSpots } from '@domain/entities/class-session';
import { Student, studentDisplayName } from '@domain/entities/student';
import { StudentPlan, studentPlanIsUsable } from '@domain/entities/student-plan';
import { Plan } from '@domain/entities/plan';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { domainErrorMessage } from '@domain/errors';
import { localDateKey } from '@domain/local-date';
import { SesionFacade } from '../sesion.facade';
import { minutosRestantes } from '../hold-countdown';

@Component({
  selector: 'app-sesion-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal #modal title="Clase" [subtitle]="subtitle()" icon="primary">
      @if (errorText()) { <p class="notice hold form-error" role="alert">{{ errorText() }}</p> }

      <h4>Inscribir</h4>
      <p class="hint">Sólo aparecen los alumnos con categoría cargada. Si la API rechaza la
         inscripción por categoría, revisá las categorías del grupo en Configuración.</p>
      <div class="field field-dense">
        <label for="res-alumno">Alumno</label>
        <!-- eslint-disable-next-line @angular-eslint/template/no-autofocus -- requerido por el contrato de ModalComponent: showModal() sólo autoenfoca un elemento con el atributo HTML 'autofocus' -->
        <select id="res-alumno" class="control" autofocus
                [value]="studentId()" (change)="onStudent($event)">
          <option value="">Elegí un alumno…</option>
          @for (s of elegibles(); track s.id) {
            <option [value]="s.id">{{ name(s) }}</option>
          }
        </select>
      </div>

      <div class="field field-dense">
        <label for="res-plan">Plan</label>
        <select id="res-plan" class="control" [value]="planId()" (change)="onPlan($event)">
          <option value="">Elegí un plan…</option>
          @for (p of planesUsables(); track p.id) {
            <option [value]="p.id">{{ planName(p.planId) }} · {{ p.creditsRemaining }} créditos</option>
          }
        </select>
        @if (studentId() && !planesUsables().length) {
          <p class="hint">
            Este alumno no tiene planes con créditos vigentes. Sin plan la reserva no se puede
            confirmar, así que hay que venderle uno antes.
          </p>
        }
      </div>
      <button type="button" class="btn btn-primary" [disabled]="!puedeReservar() || facade.loading()"
              (click)="onReservar()">Reservar</button>

      <h4>Pendientes de confirmar</h4>
      @for (h of holds(); track h.reservation.id) {
        <div class="arow">
          <div class="a-main">
            <div class="a-title">{{ nameOf(h.studentId) }}</div>
            <div class="a-meta">
              @if (vencido(h.reservation.holdExpiresAt)) {
                Venció
              } @else {
                {{ minutos(h.reservation.holdExpiresAt) }} min para que venza
              }
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm"
                  [disabled]="facade.loading() || vencido(h.reservation.holdExpiresAt)"
                  (click)="onConfirmar(h.reservation.id)">Confirmar</button>
          <button type="button" class="btn btn-danger btn-sm" [disabled]="facade.loading()"
                  (click)="onCancelar(h.reservation.id)">Cancelar</button>
        </div>
      } @empty {
        <p class="a-empty">Ninguna reserva pendiente en esta visita.</p>
      }

      <h4>Lista de espera</h4>
      @for (e of facade.data() ?? []; track e.id) {
        <div class="arow">
          <div class="a-main"><div class="a-title">{{ nameOf(e.studentId) }}</div></div>
          <button type="button" class="btn btn-ghost btn-sm" [disabled]="facade.loading()"
                  (click)="onQuitar(e.id)">Quitar</button>
        </div>
      } @empty {
        <p class="a-empty">Sin lista de espera.</p>
      }
      <button type="button" class="btn btn-ghost" [disabled]="!studentId() || facade.loading()"
              (click)="onAnotar()">Anotar al alumno elegido</button>

      <div class="modal-foot" modal-foot>
        <button type="button" class="btn btn-ghost" (click)="close()">Cerrar</button>
      </div>
    </app-modal>
  `,
  styles: [`
    .form-error{margin-bottom:var(--space-md)}
    h4{margin:var(--space-md) 0 var(--space-sm)}
  `],
})
export class SesionModalComponent {
  readonly students = input.required<readonly Student[]>();
  /** id de cancha/profesor/grupo → nombre, ya resuelto por la página. */
  readonly labels = input.required<(session: ClassSession) => string>();

  protected readonly facade = inject(SesionFacade);
  private readonly repo = inject(StudentsRepository);
  private readonly plansRepo = inject(PlansRepository);
  private readonly modal = viewChild.required(ModalComponent);

  protected readonly session = signal<ClassSession | null>(null);
  protected readonly studentId = signal('');
  protected readonly planId = signal('');
  private readonly plans = signal<readonly StudentPlan[]>([]);
  /** Catálogo de planes, sólo para ponerles nombre a las opciones del select. */
  private readonly planCatalog = signal<readonly Plan[]>([]);

  /** Avanza cada 30 s. El hold dura 30 minutos: el segundero no aporta nada. */
  private readonly now = signal(new Date());

  constructor() {
    // Sólo tickea si hay un hold que contar. El modal vive montado toda la visita a
    // /reservas —el <dialog> se cierra, el componente no se destruye—, así que sin esta
    // guarda era un set() y su ciclo de detección de cambios cada 30 s para siempre.
    const timer = setInterval(() => {
      if (this.holds().length) this.now.set(new Date());
    }, 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
    // Falla en SILENCIO, mismo patrón que AlumnoPlanesFacade.loadPlanNames(): sin nombres el
    // select sigue sirviendo, sólo pierde el rótulo y muestra "Plan #id".
    void this.plansRepo.list().then((p) => this.planCatalog.set(p)).catch(() => this.planCatalog.set([]));
  }

  /**
   * Se excluyen los alumnos SIN categoría: de esos el front sabe con certeza que la API los
   * rechaza. Del resto no puede saber nada — ningún GET devuelve los items del grupo —, así
   * que se muestran todos y el 400 del backend es el feedback. Filtrar con la pista guardada
   * escondería alumnos válidos, y equivocarse escondiendo es peor que equivocarse mostrando.
   *
   * ponytail: el select no filtra por la categoría REAL del grupo, sólo excluye "sin
   * categoría". Techo: un alumno de otra categoría igual aparece acá y el 400 recién avisa al
   * confirmar. Salida: el mismo include del `list()`/`getOne()` de category-groups del backend
   * (ver CategoryGroupsRepository).
   */
  protected readonly elegibles = computed(() =>
    this.students().filter((s) => s.categoryId !== null),
  );

  protected readonly planesUsables = computed(() => {
    const hoy = localDateKey(this.now());
    return this.plans().filter((p) => studentPlanIsUsable(p, hoy));
  });

  /** planId → nombre. Mismo patrón que AlumnoPlanesFacade._names. */
  private readonly planNames = computed(
    () => new Map(this.planCatalog().map((p) => [p.id, p.name] as const)),
  );

  /** studentId → nombre. Igual que planNames: el template lo llama una vez POR FILA, en dos
   *  listas, y sin el mapa cada fila barría el padrón entero en cada ciclo de detección. */
  private readonly studentNames = computed(
    () => new Map(this.students().map((s) => [s.id, studentDisplayName(s)] as const)),
  );

  protected readonly holds = computed(() => this.facade.holdsOf(this.session()?.id ?? ''));

  protected puedeReservar(): boolean {
    return this.studentId() !== '' && this.planId() !== '';
  }

  protected subtitle(): string {
    const s = this.session();
    return s ? `${this.labels()(s)} · ${occupiedSpots(s)}/${s.capacity}` : '';
  }

  protected name(s: Student): string { return studentDisplayName(s); }

  protected nameOf(studentId: string): string {
    return this.studentNames().get(studentId) ?? `Alumno #${studentId}`;
  }

  protected minutos(holdExpiresAt: string | null): number {
    return minutosRestantes(holdExpiresAt, this.now());
  }

  /** Un hold vencido (0 min) sólo puede devolver 409 'El hold expiró' al confirmar. */
  protected vencido(holdExpiresAt: string | null): boolean {
    return this.minutos(holdExpiresAt) <= 0;
  }

  protected planName(planId: string): string {
    return this.planNames().get(planId) || `Plan #${planId}`;
  }

  protected errorText(): string {
    const err = this.facade.error();
    return err ? domainErrorMessage(err) : '';
  }

  open(session: ClassSession): void {
    this.session.set(session);
    this.studentId.set('');
    this.planId.set('');
    this.plans.set([]);
    this.facade.clearError();
    void this.facade.open(session.id);
    this.modal().open();
  }

  close(): void { this.modal().close(); }

  protected onStudent(e: Event): void {
    this.studentId.set((e.target as HTMLSelectElement).value);
    this.planId.set('');
    this.plans.set([]);
    const id = this.studentId();
    if (!id) return;
    // Falla en silencio: sin planes el select queda vacío y el cartel explica por qué. Un
    // error acá no debería tapar el de la reserva, que es el que importa.
    void this.repo.plans(id).then((p) => this.plans.set(p)).catch(() => this.plans.set([]));
  }

  protected onPlan(e: Event): void {
    this.planId.set((e.target as HTMLSelectElement).value);
  }

  /**
   * GUARD DE DOBLE-SUBMIT EN CÓDIGO, mismo patrón que AttendanceModalComponent.confirm():
   * `.btn` no bloquea la activación por teclado, así que un Enter repetido sobre el botón
   * enfocado sigue disparando click. El `[disabled]` del template es el segundo freno; éste
   * es el primero.
   *
   * En onReservar() el freno es CRITICAL y no cosmético: `class-sessions.service.ts` valida
   * club, alumno, categoría, plan y cupo, pero NUNCA chequea si el alumno ya tiene una reserva
   * en esta sesión, y `schema.prisma` no tiene índice único sobre (classSessionId, studentId).
   * Dos `reservar()` en vuelo son dos holds del mismo alumno —dos lugares consumidos de un
   * cupo de 4— y si los dos se confirman, dos créditos descontados. Nada en ninguna otra capa
   * lo impide. En los otros cuatro es prolijidad: ahí el backend responde 409 y el usuario
   * sólo se come un error rojo por hacer doble click.
   *
   * Los CINCO handlers pasan por acá y ninguno llama a la facade derecho: escrito cinco veces,
   * el freno que importa se arregla en cuatro lugares y se olvida en el quinto.
   */
  private conSesion(fn: (sessionId: string) => Promise<void>): void {
    if (this.facade.loading()) return;
    const s = this.session();
    if (s) void fn(s.id);
  }

  protected onReservar(): void {
    this.conSesion((sessionId) =>
      this.facade
        .reservar(sessionId, {
          sessionId,
          studentId: this.studentId(),
          studentPlanId: this.planId(),
        })
        .then(() => {
          // Sólo si salió bien: limpiar tras un error dejaría al usuario reescribiendo el
          // alumno y el plan que ya había elegido. Es el otro borde del mismo agujero de
          // doble-submit — sin esto el botón queda armado apuntando al mismo alumno.
          if (this.facade.error()) return;
          this.studentId.set('');
          this.planId.set('');
          this.plans.set([]);
        }),
    );
  }

  protected onConfirmar(reservationId: string): void {
    this.conSesion((sessionId) => this.facade.confirmar(sessionId, reservationId));
  }

  protected onCancelar(reservationId: string): void {
    this.conSesion((sessionId) => this.facade.cancelar(sessionId, reservationId));
  }

  protected onAnotar(): void {
    this.conSesion((sessionId) => this.facade.anotar(sessionId, this.studentId()));
  }

  protected onQuitar(entryId: string): void {
    this.conSesion((sessionId) => this.facade.quitar(sessionId, entryId));
  }
}
