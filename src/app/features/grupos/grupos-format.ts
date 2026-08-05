import { GroupSession } from '@domain/entities/group';

/** Guión largo (EM DASH, U+2014), igual que la maqueta. */
const DASH = '—';

export type OccupancyState = 'low' | 'ok' | 'full';
export type AttendanceState = 'high' | 'mid' | 'low';

/**
 * Estado de ocupación de un grupo. Origen: index-v2.html:1698-1701.
 * 'full' GANA sobre 'low' (un grupo de capacidad 0 está lleno, no vacío).
 */
export function occupancyState(enrolled: number, capacity: number): OccupancyState {
  if (capacity <= 0) return 'full';
  if (enrolled >= capacity) return 'full';
  if (enrolled <= capacity * 0.5) return 'low';   // el borde EXACTO de 50% es 'low'
  return 'ok';
}

/** Ancho de la barra de cupo, 0..100. El guard de capacity evita el NaN% de Math.round(0/0*100). */
export function occupancyPercent(enrolled: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((enrolled / capacity) * 100));
}

/** Umbrales de la barra de asistencia. Origen: index-v2.html:1737. */
export function attendanceState(rate: number): AttendanceState {
  if (rate >= 80) return 'high';   // 80 exacto es 'high'
  if (rate >= 65) return 'mid';    // 65 exacto es 'mid'
  return 'low';
}

/**
 * Celda de asistencia de una sesión: '3/4' o '—'.
 *
 * NO recibe el roster a propósito. El denominador son las marcas que se guardaron ESA vez; si
 * saliera del roster actual, la sesión que fue 4/4 se mostraría 4/5 al entrar alguien nuevo —
 * una asistencia que nunca ocurrió. La maqueta congelaba el string al guardar, con el mismo efecto.
 */
export function formatAttendance(session: GroupSession): string {
  if (session.attendance === null) return DASH;
  return `${session.attendance.filter((m) => m.present).length}/${session.attendance.length}`;
}

/**
 * Ficha "Próxima sesión" del hero. Origen: index-v2.html:1791.
 * Depende de que Group.sessions venga en orden cronológico ascendente (ver entities/group.ts).
 */
export function nextSessionDate(sessions: readonly GroupSession[]): string {
  return sessions.find((s) => s.status === 'scheduled')?.date ?? DASH;
}
