import * as v from 'valibot';

/**
 * ESTE DTO VA EN camelCase, a diferencia del resto del repo. No es un descuido.
 *
 * `class-sessions.service.list()` devuelve la fila de Prisma sin transformar, y los nombres
 * de propiedad de Prisma son camelCase: `@map("court_id")` renombra la COLUMNA en la base,
 * no la propiedad en JS. `http-courts.repository.spec.ts` ya lo documenta con sus fixtures
 * (`surfaceTypeId`, `deletedAt`). Pasarlo a snake_case "por consistencia" rompe el v.parse
 * en runtime y el compilador no lo ve.
 *
 * Sólo se declaran los campos que el dashboard usa; valibot descarta el resto de la fila.
 */
export const ClassSessionDtoSchema = v.object({
  id: v.string(),
  courtId: v.string(),
  coachId: v.string(),
  categoryGroupId: v.string(),
  /** Nullable en Prisma. Una sesión sin hora no entra en la grilla (spec §7.2). */
  startAt: v.nullable(v.string()),
  /** Nullable en Prisma. El mapper lo normaliza a 0. */
  capacity: v.nullable(v.number()),
  /** Calculado por el backend: capacity − (confirmadas + held vigentes). */
  availableSpots: v.number(),
});
export const ClassSessionListDtoSchema = v.array(ClassSessionDtoSchema);
export type ClassSessionDto = v.InferOutput<typeof ClassSessionDtoSchema>;

/**
 * `GET /class-sessions/:id/waiting-list` devuelve las entradas en estado 'esperando' de UNA
 * sesión, como filas crudas de Prisma.
 *
 * Antes esto era `v.array(v.unknown())` porque el único consumidor —el dashboard— sólo usaba
 * el LARGO del array. La pantalla de reservas sí lee adentro: muestra al alumno y necesita el
 * `id` de la anotación para poder darla de baja.
 */
export const WaitingListEntryDtoSchema = v.object({
  id: v.string(),
  studentId: v.string(),
  requestedAt: v.nullable(v.string()),
});
export type WaitingListEntryDto = v.InferOutput<typeof WaitingListEntryDtoSchema>;

export const WaitingListDtoSchema = v.array(WaitingListEntryDtoSchema);

/**
 * Lo que devuelve `POST /class-sessions/:id/reservations`: la fila de Prisma entera. Se
 * declaran sólo los dos campos que la pantalla no puede reconstruir; valibot descarta el resto.
 */
export const ReservationDtoSchema = v.object({
  id: v.string(),
  holdExpiresAt: v.nullable(v.string()),
});
export type ReservationDto = v.InferOutput<typeof ReservationDtoSchema>;
