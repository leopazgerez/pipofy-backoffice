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
 * sesión. El dashboard sólo usa el LARGO del array para saber cuánta gente espera: nunca lee
 * un campo de las entradas.
 *
 * Por eso valida el array y no su contenido. Exigir una forma a los elementos sería una
 * asunción sobre el borde que ningún consumidor necesita, y que haría fallar el v.parse
 * —tumbando la lista de espera— por un campo que nadie lee.
 */
export const WaitingListDtoSchema = v.array(v.unknown());
