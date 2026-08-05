import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ClubRepository } from '@domain/contracts/club.repository';
import { AuthRepository } from '@domain/contracts/auth.repository';
import { SessionStore } from '@data/auth/session-store';
import { SessionFacade } from '@features/auth/session.facade';
import { routes } from './app.routes';

// La ruta /dashboard bindea InMemoryDashboardRepository (sin deps de red), así que este módulo
// sólo necesita el router y el ClubRepository que DashboardFacade inyecta vía RefreshDashboard.
//
// Este TestBed arma sus providers a mano a partir de `routes`, no de `appConfig` (que ya
// bindea AuthRepository en root desde Task 7): sin este stub, /onboarding tira NG0201 acá
// igual que en runtime real. SessionStore/SessionFacade se suman por lo mismo desde Task 9:
// las rutas del shell quedan detrás de authGuard y, sin sesión, una navegación cae en /login,
// que necesita SessionFacade (bindeada en root en app.config.ts).
async function harnessAt(url: string, conSesion = true) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      SessionStore,
      SessionFacade,
      { provide: ClubRepository, useValue: { isActive: async () => true } },
      { provide: AuthRepository, useValue: { signup: async () => undefined } },
    ],
  });
  if (conSesion) {
    // Las rutas del shell están detrás de authGuard: sin sesión, todas redirigen a /login.
    TestBed.inject(SessionStore).set({
      accessToken: 'test', refreshToken: 'test', mustChangePassword: false,
    });
  }
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
}

describe('app.routes', () => {
  // SessionStore persiste en localStorage real (jsdom): sin este clear, una sesión sembrada
  // por un test anterior sobrevive a hydrate() y el test "sin sesión" queda autenticado.
  beforeEach(() => localStorage.clear());

  it('la raíz redirige a /dashboard dentro del shell', async () => {
    const harness = await harnessAt('/');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('app-shell')).toBeTruthy();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('/dashboard renderiza el dashboard operativo dentro del shell', async () => {
    const harness = await harnessAt('/dashboard');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('app-shell')).toBeTruthy();
    expect(root.querySelector('app-dashboard-page')).toBeTruthy();
  });

  it('una ruta no construida muestra el placeholder dentro del shell', async () => {
    // /grupos ya está construida (slice 2). /comercial sigue siendo enConstruccion (app.routes.ts:23).
    const harness = await harnessAt('/comercial');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('app-shell')).toBeTruthy();
    expect(root.querySelector('app-en-construccion')?.textContent).toContain('construcción');
  });

  it('/grupos renderiza la lista de grupos dentro del shell', async () => {
    const harness = await harnessAt('/grupos');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('app-shell')).toBeTruthy();
    expect(root.querySelector('app-grupos-list-page')).toBeTruthy();
  });

  it('/onboarding NO tiene shell (ruta pública)', async () => {
    const harness = await harnessAt('/onboarding');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('app-shell')).toBeNull();
    expect(root.querySelector('app-onboarding-wizard')).toBeTruthy();
  });

  it('/onboarding renderiza el wizard público, fuera del shell', async () => {
    const harness = await harnessAt('/onboarding');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('app-onboarding-wizard')).not.toBeNull();
    expect(root.querySelector('.side')).toBeNull(); // no hay sidebar del shell
  });

  it('sin sesión, una ruta protegida del shell redirige a /login', async () => {
    await harnessAt('/dashboard', false);
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fdashboard');
  });
});
