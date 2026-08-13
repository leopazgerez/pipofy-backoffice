import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthRepository } from '@domain/contracts/auth.repository';
import { SessionStore } from '@data/auth/session-store';
import { ResetPasswordPageComponent } from './reset-password-page.component';

function set(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

async function mount(url: string, repo: Partial<AuthRepository>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([
        { path: 'reset-password', component: ResetPasswordPageComponent },
        { path: 'login', component: ResetPasswordPageComponent },
      ]),
      SessionStore,
      { provide: AuthRepository, useValue: repo },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  return harness;
}

async function submit(harness: RouterTestingHarness, values: Record<string, string>) {
  const root: HTMLElement = harness.fixture.nativeElement;
  for (const [sel, value] of Object.entries(values)) set(root, sel, value);
  harness.fixture.detectChanges();
  root.querySelector('form')!.dispatchEvent(new Event('submit'));
  await harness.fixture.whenStable();
  harness.fixture.detectChanges();
  return root;
}

describe('ResetPasswordPageComponent sin token (pedir el link)', () => {
  beforeEach(() => localStorage.clear());

  it('pide el link para el email cargado', async () => {
    let pedido = '';
    const harness = await mount('/reset-password', {
      requestPasswordReset: async (email: string) => { pedido = email; },
    });

    const root = await submit(harness, { '#email': 'martin@club.com' });

    expect(pedido).toBe('martin@club.com');
    expect(root.textContent).toContain('Revisá tu correo');
  });

  // La API responde igual exista o no el email (auth.service.ts:225): prometer "te lo
  // mandamos" convertiría la pantalla en un oráculo de qué emails están registrados.
  it('el mensaje de éxito no afirma que el email exista', async () => {
    const harness = await mount('/reset-password', { requestPasswordReset: async () => undefined });
    const root = await submit(harness, { '#email': 'noexiste@club.com' });
    expect(root.textContent).toContain('Si ese email tiene cuenta');
  });

  it('con un email inválido no llama a la API', async () => {
    let llamado = false;
    const harness = await mount('/reset-password', {
      requestPasswordReset: async () => { llamado = true; },
    });
    await submit(harness, { '#email': 'no-es-un-email' });
    expect(llamado).toBe(false);
  });
});

describe('ResetPasswordPageComponent con token (elegir clave nueva)', () => {
  beforeEach(() => localStorage.clear());

  it('manda el token de la query con la clave nueva', async () => {
    let enviado: readonly string[] = [];
    const harness = await mount('/reset-password?token=tok-123', {
      confirmPasswordReset: async (token: string, nueva: string) => { enviado = [token, nueva]; },
    });

    const root = await submit(harness, {
      '#nueva': 'nuevaClave123',
      '#repetir': 'nuevaClave123',
    });

    expect(enviado).toEqual(['tok-123', 'nuevaClave123']);
    expect(root.textContent).toContain('Listo');
  });

  it('con las claves distintas no llama a la API', async () => {
    let llamado = false;
    const harness = await mount('/reset-password?token=tok-123', {
      confirmPasswordReset: async () => { llamado = true; },
    });

    const root = await submit(harness, { '#nueva': 'nuevaClave123', '#repetir': 'otraCosa456' });

    expect(llamado).toBe(false);
    expect(root.textContent).toContain('no coinciden');
  });

  it('un token vencido muestra el mensaje de la API', async () => {
    const harness = await mount('/reset-password?token=viejo', {
      confirmPasswordReset: () =>
        Promise.reject({ kind: 'domain' as const, message: 'El link venció o ya fue usado.' }),
    });

    const root = await submit(harness, {
      '#nueva': 'nuevaClave123',
      '#repetir': 'nuevaClave123',
    });

    expect(root.textContent).toContain('El link venció o ya fue usado.');
  });
});
