import { describe, it, expect } from 'vitest';
import { occupancyPercent } from './occupancy';

describe('occupancyPercent', () => {
  it('redondea y topea en 100', () => {
    expect(occupancyPercent(3, 4)).toBe(75);
    expect(occupancyPercent(5, 4)).toBe(100);
  });

  it('capacity 0 da 0, NUNCA NaN', () => {
    // Math.round(0 / 0 * 100) es NaN, y style="width:NaN%" es una declaración inválida
    // que no rompe el build ni el lint: la barra simplemente no se pinta.
    expect(occupancyPercent(0, 0)).toBe(0);
    expect(Number.isNaN(occupancyPercent(0, 0))).toBe(false);
  });
});
