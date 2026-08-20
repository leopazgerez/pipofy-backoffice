import { describe, it, expect } from 'vitest';
import { minutosRestantes } from './hold-countdown';

const now = new Date('2026-08-19T21:00:00.000Z');

describe('minutosRestantes', () => {
  it('redondea hacia arriba: 29:01 todavía es "30 min"', () => {
    // Hacia arriba y no hacia abajo: mostrar 29 cuando quedan 29 minutos y 1 segundo hace que
    // el número baje apenas se abre el modal y parezca que ya se está venciendo.
    expect(minutosRestantes('2026-08-19T21:29:01.000Z', now)).toBe(30);
  });

  it('0 cuando ya venció', () => {
    expect(minutosRestantes('2026-08-19T20:59:00.000Z', now)).toBe(0);
  });

  it('0 sin fecha y 0 con basura, en vez de NaN', () => {
    expect(minutosRestantes(null, now)).toBe(0);
    expect(minutosRestantes('no-es-una-fecha', now)).toBe(0);
  });
});
