import { describe, it, expect } from 'vitest';
import { DomainError, domainErrorMessage, isDomainError } from './errors';

describe('domainErrorMessage', () => {
  it('traduce cada kind a copy en español', () => {
    const cases: [DomainError, string][] = [
      [{ kind: 'not-found' }, 'No encontramos lo que buscabas.'],
      [{ kind: 'unauthorized' }, 'Tu sesión expiró. Volvé a iniciar sesión.'],
      [{ kind: 'network' }, 'No pudimos conectar con el servidor. Revisá tu conexión.'],
      [{ kind: 'unknown' }, 'Ocurrió un error inesperado. Intentá de nuevo.'],
    ];
    for (const [err, expected] of cases) {
      expect(domainErrorMessage(err)).toBe(expected);
    }
  });

  it('usa el mensaje del error de dominio tal cual', () => {
    expect(domainErrorMessage({ kind: 'domain', message: 'No hay sesión en Cancha 1 a las 18:00.' }))
      .toBe('No hay sesión en Cancha 1 a las 18:00.');
  });

  it('junta los issues de validación', () => {
    expect(domainErrorMessage({ kind: 'validation', issues: ['Falta el motivo.', 'Hora inválida.'] }))
      .toBe('Falta el motivo. Hora inválida.');
  });

  it('cae a un mensaje genérico si validation no trae issues', () => {
    expect(domainErrorMessage({ kind: 'validation', issues: [] }))
      .toBe('Los datos enviados no son válidos.');
  });

  it('nunca devuelve el kind crudo al usuario', () => {
    const kinds: DomainError[] = [
      { kind: 'not-found' }, { kind: 'unauthorized' }, { kind: 'network' },
      { kind: 'validation', issues: [] }, { kind: 'domain', message: 'x' }, { kind: 'unknown' },
    ];
    for (const err of kinds) {
      expect(domainErrorMessage(err)).not.toBe(err.kind);
      expect(domainErrorMessage(err).length).toBeGreaterThan(0);
    }
  });

  it('tiene copy propio para credenciales inválidas y email sin verificar', () => {
    expect(domainErrorMessage({ kind: 'invalid-credentials' })).toBe('Email o contraseña incorrectos.');
    expect(domainErrorMessage({ kind: 'email-not-verified' }))
      .toBe('Falta verificar tu email para poder entrar.');
  });

  it('isDomainError reconoce los kinds nuevos', () => {
    expect(isDomainError({ kind: 'invalid-credentials' })).toBe(true);
    expect(isDomainError({ kind: 'email-not-verified' })).toBe(true);
  });
});
