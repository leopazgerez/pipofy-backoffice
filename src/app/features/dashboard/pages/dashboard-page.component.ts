import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DashboardFacade } from '../dashboard.facade';
import { CancelReason, CourtSession, Hold } from '@domain/entities/dashboard-snapshot';
import { domainErrorMessage } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';
import { ToastService } from '@shared/ui/toast/toast.service';
import { tickHolds } from '../dashboard-format';
import { KpiRowComponent } from '../components/kpi-row.component';
import { CourtGridComponent } from '../components/court-grid.component';
import { HoldsCardComponent } from '../components/holds-card.component';
import { WaitlistCardComponent } from '../components/waitlist-card.component';
import { TransfersCardComponent } from '../components/transfers-card.component';
import { CancelSessionModalComponent, CancelTarget } from '../components/cancel-session-modal.component';

const CLUB_ID = 'c1';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    KpiRowComponent, CourtGridComponent, HoldsCardComponent, WaitlistCardComponent,
    TransfersCardComponent, CancelSessionModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  protected readonly facade = inject(DashboardFacade);
  private readonly toasts = inject(ToastService);

  // Holds locales para la cuenta regresiva client-side. Se siembran del snapshot y el
  // setInterval los descuenta; leerlos vivos (no del snapshot) alimenta el KPI y la card.
  protected readonly holds = signal<Hold[]>([]);
  protected readonly activeHolds = computed(() => this.holds().length);

  protected readonly cancelTarget = signal<CancelTarget | null>(null);
  private readonly cancelModal = viewChild(CancelSessionModalComponent);

  constructor() {
    // Sembrar los holds locales UNA VEZ POR CARGA, encadenado al load() que la provoca.
    //
    // La siembra va acá y NO en un effect sobre facade.data(): cancel() hace
    // setData(nuevoSnapshot), así que un effect se dispararía también con la cancelación
    // y el countdown se REINICIARÍA de golpe cada vez. Atarla al load() es lo que hace
    // que el snapshot de cancel() no la dispare, sin que la página tenga que adivinar
    // de dónde vino el snapshot.
    //
    // SI ALGÚN DÍA AGREGÁS UN REFRESH: tiene que sembrar también (misma línea), o el
    // countdown se queda con los holds de la carga anterior. Es la única regla acá.
    //
    // run() atrapa los errores (signal-store.base.ts:23-29), así que load() nunca
    // rechaza y este then() siempre corre: si falló, data() es null → holds vacíos.
    void this.facade.load(CLUB_ID).then(() => this.holds.set(this.facade.data()?.holds ?? []));

    // Un tick por segundo: descuenta y descarta vencidos (tickHolds es puro).
    //
    // El guard corta el tick cuando ya no queda ningún hold: tickHolds([]) devuelve un
    // array NUEVO y las señales comparan con Object.is, así que sin él cada segundo
    // ensucia la señal y dispara un ciclo de detección de cambios inútil — para siempre,
    // porque los holds de la semilla vencen todos a los ~9 min y nada los resiembra.
    // Leer this.holds() acá no crea suscripción: el callback no es contexto reactivo.
    const id = setInterval(() => {
      if (this.holds().length) this.holds.update(tickHolds);
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));

    // Abrir el modal cuando hay target Y el modal ya existe en el DOM.
    //
    // El modal está detrás de un @if (cancelTarget()), así que en el instante en que
    // openCancel() setea la señal el viewChild TODAVÍA es undefined: la vista se crea
    // recién en el próximo ciclo de detección. Este effect lo resuelve porque viewChild()
    // ES una señal: cuando la vista se crea, la señal cambia y el effect vuelve a correr,
    // esta vez con el modal ya disponible.
    //
    // NO uses queueMicrotask/setTimeout acá: en zoneless no hay garantía de que la
    // detección de cambios haya corrido para cuando el callback se ejecuta — es una
    // carrera que falla de forma intermitente.
    effect(() => {
      const target = this.cancelTarget();
      const modal = this.cancelModal();
      if (target && modal) modal.open();
    });
  }

  protected openCancel(e: { session: CourtSession; courtName: string; hour: string }): void {
    // El effect de arriba se encarga de abrirlo. Cada emisión trae un objeto nuevo, así
    // que re-clickear la misma sesión también dispara el effect.
    this.cancelTarget.set(e);
  }

  protected async onCancelConfirmed(reason: CancelReason): Promise<void> {
    const t = this.cancelTarget();
    if (!t) return;
    try {
      await this.facade.cancel(CLUB_ID, { courtName: t.courtName, hour: t.hour, reason });
      this.cancelModal()?.markDone();
      // TEXTO HONESTO: sólo lo que realmente pasó, con los datos de ESA sesión.
      // La maqueta prometía "+1 crédito" y "oferta por WhatsApp": dominios diferidos (spec §9.6).
      this.toasts.show(
        'ok',
        'Cupo liberado',
        `${t.session.category} · ${t.courtName} · ${t.hour} — el cupo quedó disponible.`,
      );
    } catch (err) {
      // El modal queda abierto mostrando el paso fallido; el toast explica en español.
      this.cancelModal()?.markFailed();
      this.toasts.show('info', 'No se pudo cancelar', domainErrorMessage(toDomainError(err)));
    }
  }
}
