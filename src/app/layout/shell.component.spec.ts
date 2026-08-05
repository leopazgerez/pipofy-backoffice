import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EnConstruccionComponent } from '@shared/ui/en-construccion.component';
import { SessionFacade } from '@features/auth/session.facade';
import { ShellComponent } from './shell.component';
import { NAV_ITEMS } from './nav.model';

const routes = [
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: 'dashboard', component: EnConstruccionComponent, data: { title: 'Operaciones en tiempo real', crumb: 'Operación' } },
      { path: 'grupos', component: EnConstruccionComponent, data: { title: 'Grupos y clases', crumb: 'Grupos' } },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' as const },
    ],
  },
];

async function setup(url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter(routes),
      { provide: SessionFacade, useValue: { logout: async () => undefined } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
}

describe('ShellComponent', () => {
  it('renderiza los 6 destinos de la nav', async () => {
    const harness = await setup('/dashboard');
    const labels = Array.from(harness.fixture.nativeElement.querySelectorAll('.nav a'))
      .map((a) => (a as HTMLElement).textContent?.trim() ?? '');
    for (const item of NAV_ITEMS) {
      expect(labels.some((l) => l.includes(item.label))).toBe(true);
    }
  });

  it('marca el destino activo según la URL', async () => {
    const harness = await setup('/grupos');
    const active = harness.fixture.nativeElement.querySelector('.nav a.on');
    expect(active?.textContent).toContain('Grupos');
  });

  it('refleja title y crumb del data de la ruta activa', async () => {
    const harness = await setup('/dashboard');
    const root: HTMLElement = harness.fixture.nativeElement;
    expect(root.querySelector('.topbar h1')?.textContent).toContain('Operaciones en tiempo real');
    expect(root.querySelector('.topbar .crumb')?.textContent).toContain('Operación');
  });

  it('el toggle del drawer abre y cierra la sidebar', async () => {
    const harness = await setup('/dashboard');
    const root: HTMLElement = harness.fixture.nativeElement;
    const hamb = root.querySelector<HTMLButtonElement>('.hamb')!;
    const side = root.querySelector('.side')!;

    expect(side.classList.contains('open')).toBe(false);
    hamb.click();
    await harness.fixture.whenStable();
    expect(side.classList.contains('open')).toBe(true);
    expect(hamb.getAttribute('aria-expanded')).toBe('true');

    hamb.click();
    await harness.fixture.whenStable();
    expect(side.classList.contains('open')).toBe(false);
    expect(hamb.getAttribute('aria-expanded')).toBe('false');
  });

  it('el botón de cerrar sesión llama a logout() y redirige a /login', async () => {
    let llamado = false;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'login', component: EnConstruccionComponent }]),
        { provide: SessionFacade, useValue: { logout: async () => { llamado = true; } } },
      ],
    });
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const btn = [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cerrar sesión'));
    expect(btn).toBeTruthy();
    btn!.click();
    await fixture.whenStable();
    expect(llamado).toBe(true);
    expect(TestBed.inject(Router).url).toBe('/login');
  });

  it('si logout() rechaza, igual redirige a /login', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([{ path: 'login', component: EnConstruccionComponent }]),
        { provide: SessionFacade, useValue: { logout: () => Promise.reject(new Error('boom')) } },
      ],
    });
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    const btn = [...root.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Cerrar sesión'));
    btn!.click();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
