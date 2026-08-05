import { describe, it, expect } from 'vitest';
import { optionalInt } from './optional-int';
import { InvalidNumberError } from './errors';

describe('optionalInt', () => {
  it('el string vacío es null: vaciar el campo es una operación válida', () => {
    expect(optionalInt('', 'x')).toBeNull();
    expect(optionalInt('   ', 'x')).toBeNull();
  });

  it('convierte un entero', () => {
    expect(optionalInt('12', 'x')).toBe(12);
    expect(optionalInt(' 7 ', 'x')).toBe(7);
  });

  it('el cero es un valor, no un vacío', () => {
    expect(optionalInt('0', 'x')).toBe(0);
  });

  it('rechaza los decimales con el mensaje que le pasan', () => {
    // El backend valida @IsInt() y responde 400 sin nombrar el campo: por eso se valida acá.
    expect(() => optionalInt('3.5', 'El ranking tiene que ser un número entero positivo.'))
      .toThrow(InvalidNumberError);
    expect(() => optionalInt('3.5', 'El ranking tiene que ser un número entero positivo.'))
      .toThrow('El ranking tiene que ser un número entero positivo.');
  });

  it('rechaza los negativos', () => {
    expect(() => optionalInt('-1', 'x')).toThrow(InvalidNumberError);
  });

  it('rechaza el texto', () => {
    expect(() => optionalInt('abc', 'x')).toThrow(InvalidNumberError);
  });
});
