import { describe, it, expect } from 'vitest';
import { formatArs, formatCountdown, tickHolds } from './dashboard-format';
import { Hold } from '@domain/entities/dashboard-snapshot';

describe('formatArs', () => {
  it('formatea cents a pesos es-AR con separador de miles y sin decimales', () => {
    expect(formatArs(24_850_000)).toBe('$248.500');
    expect(formatArs(9_600_000)).toBe('$96.000');
    expect(formatArs(0)).toBe('$0');
  });
});

describe('formatCountdown', () => {
  it('formatea segundos a m:ss con padding', () => {
    expect(formatCountdown(174)).toBe('2:54');
    expect(formatCountdown(521)).toBe('8:41');
    expect(formatCountdown(9)).toBe('0:09');
    expect(formatCountdown(0)).toBe('0:00');
  });
});

describe('tickHolds', () => {
  const holds: Hold[] = [
    { id: 'h1', name: 'A', session: 's', expiresInSeconds: 2 },
    { id: 'h2', name: 'B', session: 's', expiresInSeconds: 1 },
  ];

  it('descuenta un segundo a cada hold', () => {
    expect(tickHolds(holds).map((h) => h.expiresInSeconds)).toEqual([1, 0].filter((n) => n > 0));
  });

  it('elimina los holds que llegan a 0', () => {
    const once = tickHolds(holds);          // h2: 1->0 (fuera), h1: 2->1
    expect(once.map((h) => h.id)).toEqual(['h1']);
    const twice = tickHolds(once);          // h1: 1->0 (fuera)
    expect(twice).toEqual([]);
  });

  it('no muta el array original', () => {
    const copy = [...holds];
    tickHolds(holds);
    expect(holds).toEqual(copy);
  });
});
