import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthRepository } from '@domain/contracts/auth.repository';
import { SessionStore } from '@data/auth/session-store';
import { SessionFacade } from '../session.facade';
import { LoginPageComponent } from './login-page.component';

function set(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function clickText(root: HTMLElement, text: string): void {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  btn!.click();
}

describe('LoginPageComponent.resend', () => {
  it('si navigate() a /revisa-tu-mail rechaza (ruta todavía no registrada), igual reenvía el mail y no deja un unhandled rejection', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let reenviado: string | null = null;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        // A propósito NO se registra 'revisa-tu-mail' (la agrega Task 10): navigate() ahí
        // rechaza con NG04002, igual que pasa hoy en producción antes de que esa ruta exista.
        provideRouter([{ path: 'login', component: LoginPageComponent }]),
        SessionStore,
        SessionFacade,
        {
          provide: AuthRepository,
          useValue: {
            login: () => Promise.reject({ kind: 'email-not-verified' as const }),
            resendVerification: async (email: string) => { reenviado = email; },
          },
        },
      ],
    });

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login');
    const fixture = harness.fixture;
    const root: HTMLElement = fixture.nativeElement;

    set(root, '#email', 'a@b.com');
    set(root, '#password', 'x');
    fixture.detectChanges();
    clickText(root, 'Entrar');
    await fixture.whenStable();
    fixture.detectChanges();

    // Precondición: el login falló con email-not-verified y el botón de reenvío está visible.
    expect([...root.querySelectorAll('button')].some((b) => b.textContent?.includes('Reenviar'))).toBe(true);

    clickText(root, 'Reenviar');
    await fixture.whenStable();
    fixture.detectChanges();

    // El pedido de reenvío se hizo igual, aunque el redirect a /revisa-tu-mail haya rechazado.
    expect(reenviado).toBe('a@b.com');
    // Y el rechazo no quedó como unhandled rejection: se logueó con el tag [auth].
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('[auth]'),
      expect.anything(),
    );
    consoleError.mockRestore();
  });
});
