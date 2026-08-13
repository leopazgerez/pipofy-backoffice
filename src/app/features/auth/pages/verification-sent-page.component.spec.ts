import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { set } from './form-spec-helpers';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthRepository } from '@domain/contracts/auth.repository';
import { VerificationSentPageComponent } from './verification-sent-page.component';

function clickText(root: HTMLElement, text: string): void {
  const btn = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  btn!.click();
}

async function setup(url: string, resendVerification: (email: string) => Promise<void>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideRouter([{ path: 'revisa-tu-mail', component: VerificationSentPageComponent }]),
      {
        provide: AuthRepository,
        useValue: {
          signup: () => Promise.reject(new Error('no usado en este spec')),
          login: () => Promise.reject(new Error('no usado en este spec')),
          refresh: () => Promise.reject(new Error('no usado en este spec')),
          logout: () => Promise.reject(new Error('no usado en este spec')),
          verifyEmail: () => Promise.reject(new Error('no usado en este spec')),
          resendVerification,
        },
      },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const fixture = harness.fixture;
  fixture.detectChanges();
  return { root: fixture.nativeElement as HTMLElement, fixture };
}

describe('VerificationSentPageComponent.resend', () => {
  it('email prefilled malformado por query param: no reenvía y muestra el error de validación', async () => {
    let called = false;
    const { root, fixture } = await setup('/revisa-tu-mail?email=no-es-un-email', async () => {
      called = true;
    });

    clickText(root, 'Reenviar');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(called).toBe(false);
    expect(root.textContent).toContain('Ingresá un email válido.');
  });

  it('email prefilled válido por query param: reenvía y el facade recibe ese email', async () => {
    let received: string | null = null;
    const { root, fixture } = await setup('/revisa-tu-mail?email=martin@clubsolaris.com', async (email) => {
      received = email;
    });

    clickText(root, 'Reenviar');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(received).toBe('martin@clubsolaris.com');
  });

  it('camino tipeado con el campo vacío: no reenvía', async () => {
    let called = false;
    const { root, fixture } = await setup('/revisa-tu-mail', async () => {
      called = true;
    });

    clickText(root, 'Reenviar');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(called).toBe(false);
  });

  it('camino tipeado con un email válido: reenvía y el facade lo recibe', async () => {
    let received: string | null = null;
    const { root, fixture } = await setup('/revisa-tu-mail', async (email) => {
      received = email;
    });

    set(root, '#email', 'martin@clubsolaris.com');
    fixture.detectChanges();
    clickText(root, 'Reenviar');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(received).toBe('martin@clubsolaris.com');
  });
});
