import { describe, it, expect } from 'vitest';
import {
  StudentPlan,
  studentPlanIsExpired,
  studentPlanIsUsable,
  usableCredits,
} from './student-plan';

function plan(over: Partial<StudentPlan> = {}): StudentPlan {
  return {
    id: '1',
    planId: '10',
    purchasedAt: '2026-08-01',
    creditsTotal: 8,
    creditsRemaining: 5,
    expiresAt: '2026-09-01',
    ...over,
  };
}

describe('studentPlanIsUsable', () => {
  it('sirve si le quedan créditos y no venció', () => {
    expect(studentPlanIsUsable(plan(), '2026-08-13')).toBe(true);
  });

  it('no sirve sin créditos, aunque esté vigente', () => {
    expect(studentPlanIsUsable(plan({ creditsRemaining: 0 }), '2026-08-13')).toBe(false);
  });

  // El caso que hace falta distinguir: 5 créditos en un plan vencido se LEEN como crédito
  // disponible y no lo son. Es la razón de que esta función exista.
  it('no sirve vencido, aunque le queden créditos', () => {
    expect(studentPlanIsUsable(plan({ expiresAt: '2026-08-12' }), '2026-08-13')).toBe(false);
  });

  it('el día del vencimiento todavía sirve', () => {
    expect(studentPlanIsUsable(plan({ expiresAt: '2026-08-13' }), '2026-08-13')).toBe(true);
  });

  // plan.validityDays puede ser null y ahí el backend guarda expiresAt = null
  // (student-plans.service.ts:57): eso es "no vence", no "venció".
  it('sin fecha de vencimiento sirve siempre', () => {
    expect(studentPlanIsUsable(plan({ expiresAt: null }), '2030-01-01')).toBe(true);
  });

  it('creditsRemaining null cuenta como cero', () => {
    expect(studentPlanIsUsable(plan({ creditsRemaining: null }), '2026-08-13')).toBe(false);
  });
});

describe('studentPlanIsExpired', () => {
  // Es la pregunta que hace la marca "Vencido" de la fila, y NO es la negación de
  // studentPlanIsUsable: un plan sin créditos pero vigente no está vencido.
  it('un plan sin créditos pero vigente NO está vencido', () => {
    expect(studentPlanIsExpired(plan({ creditsRemaining: 0 }), '2026-08-13')).toBe(false);
    expect(studentPlanIsUsable(plan({ creditsRemaining: 0 }), '2026-08-13')).toBe(false);
  });

  it('el día del vencimiento todavía no está vencido', () => {
    expect(studentPlanIsExpired(plan({ expiresAt: '2026-08-13' }), '2026-08-13')).toBe(false);
  });

  it('el día siguiente sí', () => {
    expect(studentPlanIsExpired(plan({ expiresAt: '2026-08-12' }), '2026-08-13')).toBe(true);
  });

  it('sin fecha nunca está vencido', () => {
    expect(studentPlanIsExpired(plan({ expiresAt: null }), '2030-01-01')).toBe(false);
  });
});

describe('usableCredits', () => {
  it('suma sólo los créditos de los planes que sirven hoy', () => {
    const plans = [
      plan({ id: '1', creditsRemaining: 5 }),
      plan({ id: '2', creditsRemaining: 3, expiresAt: '2026-01-01' }),   // vencido
      plan({ id: '3', creditsRemaining: 0 }),                             // sin créditos
      plan({ id: '4', creditsRemaining: 2, expiresAt: null }),            // sin vencimiento
    ];
    expect(usableCredits(plans, '2026-08-13')).toBe(7);
  });

  it('sin planes da cero', () => {
    expect(usableCredits([], '2026-08-13')).toBe(0);
  });
});
