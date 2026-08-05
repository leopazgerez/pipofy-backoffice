import { describe, it, expect, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardPageComponent } from './dashboard-page.component';
import { DashboardFacade } from '../dashboard.facade';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { ClubRepository } from '@domain/contracts/club.repository';
import { InMemoryDashboardRepository } from '@data/repositories/in-memory-dashboard.repository';
import { ToastService } from '@shared/ui/toast/toast.service';

/** Integración real: repo in-memory con latencia 0 y estado vivo. */
async function mount(repo: DashboardRepository = new InMemoryDashboardRepository(0)) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      DashboardFacade,
      { provide: DashboardRepository, useValue: repo },
      { provide: ClubRepository, useValue: { isActive: async () => true } },
    ],
  });
  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await flushRepo();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, toasts: TestBed.inject(ToastService) };
}

const sessBtns = (el: HTMLElement) => el.querySelectorAll<HTMLButtonElement>('button.sess');

// Un salto de MACROTAREA que deja drenar toda la cola de microtareas. Es obligatorio:
// fixture.whenStable() sólo espera el PendingTasks de Angular (HTTP, router) y cede UN tick
// de microtarea — no espera la cadena load()→run()→setData()→then() de la facade, que no
// está registrada ahí y tiene varias microtareas de profundidad. Sin esto, los asserts
// corren antes de que el dashboard exista. (Probado: hacer que el repo resuelva por
// microtarea con latencia 0 NO lo reemplaza — rompe estos mismos 4 tests.)
const flushRepo = () => new Promise((r) => setTimeout(r, 0));

function pickReason(el: HTMLElement, value: string) {
  const sel = el.querySelector<HTMLSelectElement>('#cancel-reason')!;
  sel.value = value;
  sel.dispatchEvent(new Event('change'));
}

describe('DashboardPageComponent', () => {
  it('renderiza el dashboard con la grilla y el rail', async () => {
    const { el } = await mount();
    expect(el.querySelector('#view-dashboard')).toBeTruthy();
    expect(el.querySelector('app-court-grid')).toBeTruthy();
    expect(el.querySelectorAll('.rail app-holds-card, .rail app-waitlist-card, .rail app-transfers-card').length).toBe(3);
  });

  it('click en una sesión abre el modal con los datos de ESA sesión', async () => {
    const { fixture, el } = await mount();
    expect(el.querySelector('app-cancel-session-modal')).toBeNull();   // no existe hasta que haya target

    sessBtns(el)[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(el.querySelector('app-cancel-session-modal')).toBeTruthy();
    // El effect de apertura corrió: el modal está detrás de un @if, así que el viewChild
    // no existía cuando openCancel() seteó la señal.
    expect(el.querySelector('dialog')!.open).toBe(true);
    // La primera sesión de la semilla es '8va' en Cancha 1 / 16:00.
    expect(el.querySelector('.m-sub')?.textContent).toContain('8va · Cancha 1 · 16:00');
    // El foco lo pone showModal() vía autofocus — no verificable en jsdom (ver constraint 6b).
  });

  it('cancelar hace desaparecer el slot de la grilla y emite el toast con datos reales', async () => {
    const { fixture, el, toasts } = await mount();
    const antes = sessBtns(el).length;

    sessBtns(el)[0].click();
    fixture.detectChanges();
    pickReason(el, 'lluvia');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    await fixture.whenStable();
    await flushRepo();
    fixture.detectChanges();

    expect(sessBtns(el).length).toBe(antes - 1);
    expect(toasts.toasts().length).toBe(1);
    expect(toasts.toasts()[0].type).toBe('ok');
    expect(toasts.toasts()[0].title).toBe('Cupo liberado');
    expect(toasts.toasts()[0].desc).toContain('8va · Cancha 1 · 16:00');
    // Ningún texto promete features diferidas.
    expect(toasts.toasts()[0].desc).not.toContain('crédito');
    expect(toasts.toasts()[0].desc).not.toContain('WhatsApp');
  });

  it('si cancelSession falla: toast de error con copy en español y el modal sigue abierto', async () => {
    const base = new InMemoryDashboardRepository(0);
    const repo: DashboardRepository = {
      getSnapshot: (id: string) => base.getSnapshot(id),
      cancelSession: async () => { throw { kind: 'network' as const }; },
    };
    const { fixture, el, toasts } = await mount(repo);
    const antes = sessBtns(el).length;

    sessBtns(el)[0].click();
    fixture.detectChanges();
    pickReason(el, 'otro');
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(sessBtns(el).length).toBe(antes);                       // nada se movió
    expect(el.querySelector('.flow-step')?.classList.contains('failed')).toBe(true);
    expect(el.querySelector('.modal-foot')?.hasAttribute('hidden')).toBe(false);
    expect(toasts.toasts()[0].type).toBe('info');
    expect(toasts.toasts()[0].title).toBe('No se pudo cancelar');
    expect(toasts.toasts()[0].desc).toBe('No pudimos conectar con el servidor. Revisá tu conexión.');
    expect(toasts.toasts()[0].desc).not.toContain('network');      // nunca el kind crudo
  });

  describe('regresión: el countdown de holds', () => {
    afterEach(() => vi.useRealTimers());

    it('NO se reinicia al cancelar una sesión', async () => {
      // OJO — los timers falsos tienen que instalarse ANTES de crear el componente:
      // su setInterval del countdown nace en el constructor y, si se registrara con el
      // setInterval REAL, advanceTimersByTime() no lo tocaría y el test mediría nada.
      // Por eso este test NO usa mount(): monta a mano bajo timers falsos.
      vi.useFakeTimers();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          DashboardFacade,
          { provide: DashboardRepository, useValue: new InMemoryDashboardRepository(0) },
          { provide: ClubRepository, useValue: { isActive: async () => true } },
        ],
      });
      const fixture = TestBed.createComponent(DashboardPageComponent);
      const el = fixture.nativeElement as HTMLElement;
      fixture.detectChanges();

      // Resuelve la latencia simulada del repo (setTimeout de 0ms). NO uses
      // runAllTimersAsync(): el setInterval del countdown es infinito y lo haría abortar.
      await vi.advanceTimersByTimeAsync(1);
      fixture.detectChanges();

      const leer = () => (fixture.componentInstance as unknown as { holds: () => { expiresInSeconds: number }[] }).holds();
      const inicial = leer()[0].expiresInSeconds;
      const sesionesAntes = sessBtns(el).length;

      await vi.advanceTimersByTimeAsync(5000);   // 5 ticks del countdown
      fixture.detectChanges();
      const descontado = leer()[0].expiresInSeconds;
      expect(descontado).toBe(inicial - 5);

      sessBtns(el)[0].click();
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(0);      // deja crear el modal (@if)
      fixture.detectChanges();
      pickReason(el, 'profesor');
      fixture.detectChanges();
      el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
      await vi.advanceTimersByTimeAsync(1);      // resuelve el cancelSession del repo
      fixture.detectChanges();

      expect(sessBtns(el).length).toBe(sesionesAntes - 1);   // el slot se liberó de verdad

      // cancel() hace setData(nuevoSnapshot). Si la siembra de holds colgara de facade.data()
      // (un effect) en vez del load(), este setData la volvería a disparar y el countdown
      // saltaría de vuelta a `inicial`. Esa es la regresión que cuida este test.
      expect(leer()[0].expiresInSeconds).toBe(descontado);
      expect(leer()[0].expiresInSeconds).not.toBe(inicial);
    });
  });
});
