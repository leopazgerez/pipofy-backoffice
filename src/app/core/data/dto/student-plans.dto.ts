import * as v from 'valibot';

/**
 * `GET /students/:id/plans`. Todo lo declarado acá viene del modelo Prisma StudentPlan.
 *
 * `studentPlanStatusId` NO se declara: no hay catálogo para traducirlo, igual que
 * `studentStatusId` en students.dto.ts. v.object lo descarta junto con studentId,
 * createdAt y updatedAt.
 *
 * Casi todo es nullable porque el schema lo permite: `credits_total`, `credits_remaining`,
 * `purchased_at` y `expires_at` son opcionales en la tabla, y `expiresAt` es null de verdad
 * cuando el plan no tiene validityDays (student-plans.service.ts:57).
 */
export const StudentPlanDtoSchema = v.object({
  id: v.string(),
  planId: v.string(),
  purchasedAt: v.nullable(v.string()),
  creditsTotal: v.nullable(v.number()),
  creditsRemaining: v.nullable(v.number()),
  expiresAt: v.nullable(v.string()),
  deletedAt: v.nullable(v.string()),
});
export type StudentPlanDto = v.InferOutput<typeof StudentPlanDtoSchema>;

export const StudentPlanListDtoSchema = v.array(StudentPlanDtoSchema);
