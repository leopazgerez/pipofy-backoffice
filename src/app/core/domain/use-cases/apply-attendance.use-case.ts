import { AttendanceMark, Group, GroupSession, RosterMember } from '../entities/group';
import { GroupSessionNotFoundError, SessionCancelledError } from '../errors';

/**
 * Cuántos integrantes computan crédito en esta toma. Es el contador EN VIVO del modal.
 *
 * NO aplica el piso en 0: sólo recibe las marcas, no ve los créditos de nadie. Un integrante
 * en 0 suma acá y no pierde nada en applyAttendance. Es deliberado — el contador corre antes
 * de guardar, cuando todavía no se sabe nada de saldos — y es la razón de que el toast diga
 * "clase(s) computada(s)" en vez de "crédito(s) descontados".
 */
export function creditsToDiscount(
  marks: readonly AttendanceMark[],
  discountAbsences: boolean,
): number {
  return discountAbsences ? marks.length : marks.filter((m) => m.present).length;
}

/**
 * Estado nuevo del grupo después de registrar la asistencia de una sesión.
 * Puro: no muta la entrada, no toca repos, no lee la fecha del sistema.
 *
 * EL MODO SE DERIVA DE session.status, NO se recibe por parámetro. Un `taking: boolean` que
 * viaja desde el componente hasta acá se puede mentir, y descontar créditos dos veces sobre
 * la misma sesión es el peor bug posible de esta pantalla. La UI nunca ofrece el botón en una
 * sesión cancelada, pero el dominio no confía en la UI.
 *
 * OJO: esta defensa tiene dos apoyos FUERA de esta función y los dos hacen falta:
 *   · el repo muta this.snapshot ANTES del await de latencia (in-memory-groups.repository.ts),
 *   · el modal tiene un guard de doble-submit en código, no sólo .btn.loading.
 */
export function applyAttendance(
  group: Group,
  sessionId: string,
  marks: readonly AttendanceMark[],
  discountAbsences: boolean,
): Group {
  const session = group.sessions.find((s) => s.id === sessionId);
  if (!session) throw new GroupSessionNotFoundError(group.id, sessionId);
  if (session.status === 'cancelled') throw new SessionCancelledError();

  // Reconciliación contra el roster: descarta marcas huérfanas (el roster puede haber cambiado
  // entre la toma y la edición — no es un error), deduplica por memberId (dos marcas del mismo
  // integrante le sacarían dos créditos) y asume PRESENTE al que no tiene marca.
  const byMember = new Map(marks.map((m) => [m.memberId, m.present]));
  const reconciled: AttendanceMark[] = group.roster.map((r) => ({
    memberId: r.id,
    present: byMember.get(r.id) ?? true,
  }));

  const taking = session.status === 'scheduled';

  const roster: RosterMember[] = taking
    ? group.roster.map((r, i) => {
        const consume = reconciled[i].present || discountAbsences;
        return consume ? { ...r, credits: Math.max(0, r.credits - 1) } : r;
      })
    : [...group.roster];

  const updated: GroupSession = { ...session, status: 'completed', attendance: reconciled };

  return {
    ...group,
    roster,
    sessions: group.sessions.map((s) => (s.id === sessionId ? updated : s)),
  };
}
