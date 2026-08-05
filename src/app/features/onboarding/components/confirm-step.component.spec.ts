import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ConfirmStepComponent } from './confirm-step.component';
import { passwordsMatch } from '../onboarding.validators';

function fullForm() {
  const fb = new FormBuilder();
  const form = fb.group({
    role: fb.control<'profesor' | 'club' | null>('club'),
    account: fb.group({
      nombre: ['Ana'], apellido: ['Diaz'], email: ['ana@club.com'],
      password: ['Sup3rSecret!'], confirm: ['Sup3rSecret!'], nombreClub: ['Club Solaris'],
    }, { validators: [passwordsMatch] }),
    acceptedTerms: [false, [Validators.requiredTrue]],
  });
  return form;
}

async function render() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(ConfirmStepComponent);
  fixture.componentRef.setInput('form', fullForm());
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('ConfirmStepComponent', () => {
  it('muestra el resumen de la cuenta, incluido el club', async () => {
    const { el } = await render();
    expect(el.textContent).toContain('ana@club.com');
    expect(el.textContent).toContain('Ana Diaz');
    expect(el.textContent).toContain('Club Solaris');
    expect(el.textContent).toContain('Dueño de club');
  });

  it('emite editStep al tocar "Editar"', async () => {
    const { fixture, el } = await render();
    let emitted: string | undefined;
    fixture.componentInstance.editStep.subscribe((s) => (emitted = s));
    const editBtn = el.querySelector<HTMLButtonElement>('.sum-edit')!;
    editBtn.click();
    await fixture.whenStable();
    expect(emitted).toBe('account');
  });
});
