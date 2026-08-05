import { describe, it, expect } from 'vitest';
import { formatPlanPrice } from './plan-price';

describe('formatPlanPrice', () => {
  it('formatea en pesos con separador de miles es-AR', () => {
    expect(formatPlanPrice('12000')).toBe('$12.000');
  });

  it('redondea los centavos, igual que el dashboard', () => {
    expect(formatPlanPrice('12000.5')).toBe('$12.001');
    expect(formatPlanPrice('12000.4')).toBe('$12.000');
  });

  it('sin precio muestra una raya', () => {
    expect(formatPlanPrice(null)).toBe('—');
  });

  it('el cero es un precio, no un vacío', () => {
    expect(formatPlanPrice('0')).toBe('$0');
  });

  it('si el backend manda algo que no es número, lo muestra crudo en vez de "$NaN"', () => {
    expect(formatPlanPrice('en consulta')).toBe('en consulta');
  });
});
