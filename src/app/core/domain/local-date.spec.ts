import { describe, it, expect } from 'vitest';
import { isOnLocalDate } from './local-date';

describe('isOnLocalDate', () => {
  it('una sesión de las 22:00 locales pertenece a SU día local, no al UTC', () => {
    // test-setup.ts fija TZ=America/Argentina/Buenos_Aires (UTC-3): las 22:00 del 19 locales
    // son las 01:00Z del 20. Comparar en UTC la mandaría al día siguiente, que es exactamente
    // el bug que este predicado existe para evitar.
    expect(isOnLocalDate('2026-08-20T01:00:00.000Z', '2026-08-19')).toBe(true);
  });

  it('false cuando cae en otro día local', () => {
    expect(isOnLocalDate('2026-08-20T15:00:00.000Z', '2026-08-19')).toBe(false);
  });

  it('false con null, sin tirar', () => {
    expect(isOnLocalDate(null, '2026-08-19')).toBe(false);
  });

  it('false con una fecha inválida, sin tirar', () => {
    // startAt es nullable en Prisma y nadie lo valida del otro lado.
    expect(isOnLocalDate('no-es-una-fecha', '2026-08-19')).toBe(false);
  });
});
