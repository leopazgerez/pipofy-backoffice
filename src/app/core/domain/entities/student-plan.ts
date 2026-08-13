/**
 * Un plan comprado por un alumno: `GET /students/:id/plans`.
 *
 * `studentPlanStatusId` NO se declara, por el mismo motivo que `studentStatusId` en Student:
 * el backend lo manda pero no hay catálogo para traducirlo (no existe
 * GET /catalogs/student-plan-statuses). El estado que la pantalla necesita se deduce de los
 * créditos y la fecha, que sí vienen.
 */
export interface StudentPlan {
  readonly id: string;
  readonly planId: string;
  /** yyyy-MM-dd, ya recortado del ISO que devuelve el backend. */
  readonly purchasedAt: string | null;
  readonly creditsTotal: number | null;
  readonly creditsRemaining: number | null;
  /** yyyy-MM-dd. null = no vence (el plan no tenía validityDays). */
  readonly expiresAt: string | null;
}

/**
 * `today` entra por parámetro y no se lee de `new Date()` acá: el dominio es TS puro y
 * testeable, y quién sabe qué día es "hoy" en la zona del club es la capa de arriba.
 * Ambas fechas son yyyy-MM-dd, así que comparar strings alcanza y ordena bien.
 */
export function studentPlanIsUsable(plan: StudentPlan, today: string): boolean {
  if ((plan.creditsRemaining ?? 0) <= 0) return false;
  return plan.expiresAt === null || plan.expiresAt >= today;
}

/** Los créditos que el alumno puede usar HOY: los de planes vencidos no cuentan. */
export function usableCredits(plans: readonly StudentPlan[], today: string): number {
  return plans
    .filter((p) => studentPlanIsUsable(p, today))
    .reduce((sum, p) => sum + (p.creditsRemaining ?? 0), 0);
}
