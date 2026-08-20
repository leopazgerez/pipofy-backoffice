/**
 * Una anotación en la lista de espera de una clase: `GET /class-sessions/:id/waiting-list`,
 * que devuelve sólo las que están en estado 'esperando'.
 *
 * `id` es el de la ANOTACIÓN, no el del alumno: es lo que pide `DELETE /waiting-list/:id`.
 * El nombre del alumno no viene — el backend no incluye la relación —, así que la pantalla
 * lo resuelve contra la lista de alumnos que ya tiene cargada.
 */
export interface WaitingListEntry {
  readonly id: string;
  readonly studentId: string;
  readonly requestedAt: string | null;
}
