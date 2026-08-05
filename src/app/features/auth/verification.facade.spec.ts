import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { VerificationFacade } from './verification.facade';
import { AuthRepository } from '@domain/contracts/auth.repository';

function setup(repo: Partial<AuthRepository>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      VerificationFacade,
      { provide: AuthRepository, useValue: repo },
    ],
  });
  return TestBed.inject(VerificationFacade);
}

describe('VerificationFacade', () => {
  it('verify() sin error deja verified() en true', async () => {
    const f = setup({ verifyEmail: async () => undefined });
    await f.verify('token-valido');
    expect(f.verified()).toBe(true);
    expect(f.error()).toBeNull();
  });

  it('un token vencido deja el error de dominio y verified() en false', async () => {
    const f = setup({
      verifyEmail: () => Promise.reject({ kind: 'domain' as const, message: 'El link venció o ya fue usado.' }),
    });
    await f.verify('token-vencido');
    expect(f.verified()).toBe(false);
    expect(f.error()).toEqual({ kind: 'domain', message: 'El link venció o ya fue usado.' });
  });

  it('resend() marca sent() y limpia el error anterior', async () => {
    let pedido = '';
    const f = setup({
      verifyEmail: () => Promise.reject({ kind: 'domain' as const, message: 'vencido' }),
      resendVerification: async (email: string) => { pedido = email; },
    });
    await f.verify('x');
    expect(f.error()).not.toBeNull();

    await f.resend('martin@club.com');
    expect(pedido).toBe('martin@club.com');
    expect(f.sent()).toBe(true);
    expect(f.error()).toBeNull();
  });

  it('un fallo de red en resend() deja el error y NO marca sent()', async () => {
    const f = setup({ resendVerification: () => Promise.reject({ kind: 'network' as const }) });
    await f.resend('martin@club.com');
    expect(f.sent()).toBe(false);
    expect(f.error()).toEqual({ kind: 'network' });
  });
});
