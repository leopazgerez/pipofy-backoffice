import { describe, it, expect } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { trimmedMinLength, passwordsMatch, firstErrorMessage } from './onboarding.validators';
import { EMAIL_RE } from '@shared/validators/email';

describe('onboarding.validators', () => {
  it('EMAIL_RE acepta un email válido y rechaza uno inválido', () => {
    expect(EMAIL_RE.test('martin@club.com')).toBe(true);
    expect(EMAIL_RE.test('martin@club')).toBe(false);
    expect(EMAIL_RE.test('sin-arroba')).toBe(false);
  });

  it('trimmedMinLength ignora espacios y exige el mínimo', () => {
    const v = trimmedMinLength(2);
    expect(v(new FormControl('a'))).toEqual({ trimmedMinLength: { min: 2, actual: 1 } });
    expect(v(new FormControl('  ab  '))).toBeNull();
    expect(v(new FormControl(''))).toBeNull(); // vacío lo maneja required
  });

  it('passwordsMatch marca error si password !== confirm', () => {
    const group = new FormGroup({ password: new FormControl('abcdefgh'), confirm: new FormControl('xxxxxxxx') });
    expect(passwordsMatch(group)).toEqual({ passwordsMatch: true });
    group.controls.confirm.setValue('abcdefgh');
    expect(passwordsMatch(group)).toBeNull();
  });

  it('firstErrorMessage devuelve el mensaje del primer error presente', () => {
    const ctrl = new FormControl('');
    ctrl.setErrors({ required: true });
    expect(firstErrorMessage(ctrl, { required: 'Requerido.' })).toBe('Requerido.');
    expect(firstErrorMessage(new FormControl('ok'), { required: 'Requerido.' })).toBe('');
  });
});
