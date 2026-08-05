import { describe, it, expect } from 'vitest';
import { passwordStrength, strengthInfo } from './password-strength';

describe('passwordStrength', () => {
  it('0 para vacío o muy corto sin variedad', () => {
    expect(passwordStrength('')).toBe(0);
    expect(passwordStrength('abc')).toBe(0);
  });
  it('sube con longitud, mayúsc/minúsc, dígitos y símbolos', () => {
    expect(passwordStrength('abcdefgh')).toBe(1);        // >=8
    expect(passwordStrength('abcdefgH')).toBe(2);        // >=8 + aA
    expect(passwordStrength('abcdefgH9')).toBe(3);       // + dígito
    expect(passwordStrength('abcdefgH9!')).toBe(4);      // + símbolo
  });
  it('strengthInfo devuelve el label correspondiente', () => {
    expect(strengthInfo('abcdefgH9!').label).toBe('Excelente');
    expect(strengthInfo('').label).toBe('Muy débil');
  });
});
