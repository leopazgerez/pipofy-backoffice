import * as v from 'valibot';

/**
 * `studentStatusId` NO se declara a propósito: el backend lo manda pero no hay catálogo
 * para traducirlo (no existe GET /catalogs/student-statuses, §2.3), así que la UI no lo
 * usa. v.object lo descarta junto con clubId, createdAt y updatedAt.
 */
export const StudentDtoSchema = v.object({
  id: v.string(),
  phone: v.string(),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  birthDate: v.nullable(v.string()),
  categoryId: v.nullable(v.string()),
  dominantHand: v.nullable(v.string()),
  ranking: v.nullable(v.number()),
  notes: v.nullable(v.string()),
  deletedAt: v.nullable(v.string()),
});
export type StudentDto = v.InferOutput<typeof StudentDtoSchema>;

export const StudentListDtoSchema = v.array(StudentDtoSchema);

/**
 * Write-path. DOS claves opcionales, por dos motivos distintos:
 *
 * `categoryId` se omite cuando es null porque BigInt(null) tira TypeError → 500 (§3.2).
 * `birthDate` se omite cuando es null porque mandarlo no lo vacía: el service lo convierte
 *   en undefined y Prisma no toca el campo (§3.3). Omitirlo hace lo mismo sin fingir.
 *
 * `phone` se manda siempre, pero el backend lo IGNORA en el PATCH (§3.1). Se manda igual
 *   para no tener dos schemas; el valor es el original porque el campo es readonly.
 *
 * `studentStatusId` no está: el alta lo fuerza a 'pending_classification' del lado del
 *   backend y la UI no puede editarlo sin catálogo.
 */
export const StudentRequestSchema = v.object({
  phone: v.string(),
  firstName: v.nullable(v.string()),
  lastName: v.nullable(v.string()),
  birthDate: v.optional(v.string()),
  categoryId: v.optional(v.string()),
  dominantHand: v.nullable(v.string()),
  ranking: v.nullable(v.number()),
  notes: v.nullable(v.string()),
});
export type StudentRequest = v.InferOutput<typeof StudentRequestSchema>;
