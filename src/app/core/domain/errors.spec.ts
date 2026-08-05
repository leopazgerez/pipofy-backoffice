import { describe, it, expect } from 'vitest';
import { GroupNotFoundError, GroupSessionNotFoundError, SessionCancelledError, DomainRuleError } from './errors';

describe('errores de Grupos', () => {
  // Extender DomainRuleError es lo que hace que estos errores lleguen al usuario con SU mensaje
  // en vez de "Ocurrió un error inesperado": toDomainError los normaliza a { kind: 'domain' } por
  // instanceof. Esa normalización es genérica y vive en data/ — la cubre to-domain-error.spec.ts.
  // Acá, en domain (que no puede importar de data), se fija lo que es de domain: la herencia y el copy.
  it('los tres extienden DomainRuleError y llevan su mensaje', () => {
    const casos = [
      { err: new GroupNotFoundError('7'),                texto: 'No existe el grupo 7.' },
      { err: new GroupSessionNotFoundError('1', '1-s9'), texto: 'La sesión 1-s9 no pertenece al grupo 1.' },
      { err: new SessionCancelledError(),                texto: 'No se puede tomar asistencia de una sesión cancelada.' },
    ];

    for (const { err, texto } of casos) {
      expect(err).toBeInstanceOf(DomainRuleError);
      expect(err.message).toBe(texto);
    }
  });
});
