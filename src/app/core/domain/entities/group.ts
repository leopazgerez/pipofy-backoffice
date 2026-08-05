export type SessionStatus = 'scheduled' | 'completed' | 'cancelled';

export interface RosterMember {
  /** Id de la INSCRIPCIÓN — siempre presente. La maqueta usa `sid`, que es undefined en media
   *  semilla y por eso no sirve como clave de las marcas de asistencia. */
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly category: string;
  readonly credits: number;
  readonly attendanceRate: number;   // 0..100
}

export interface WaitlistEntry {
  readonly name: string;
  readonly initials: string;
  readonly since: string;            // ya formateado por el backend: 'hace 2 días', 'hoy'
}

export interface AttendanceMark {
  readonly memberId: string;         // RosterMember.id
  readonly present: boolean;
}

/**
 * INVARIANTE: `attendance !== null` ⟺ `status === 'completed'`.
 *
 * Sin ella el modelo permite cuatro estados imposibles, y el peor —'completed' con
 * attendance null— es el que produce una semilla mal expandida: el modo editar del modal
 * arranca leyendo `attendance` y se encuentra un null.
 *
 * La hacen cumplir DOS lugares, y hacen falta los dos:
 *   · applyAttendance (única escritura del slice: pasa a completed y setea marcas a la vez),
 *   · el mapper, que rechaza un DTO que la viole (borde de datos).
 */
export interface GroupSession {
  readonly id: string;
  readonly date: string;             // '01/07' — ya formateado por el backend
  readonly time: string;             // '18:00'
  readonly courtName: string;
  readonly status: SessionStatus;
  readonly attendance: readonly AttendanceMark[] | null;
}

export interface Group {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly teacher: string;
  readonly teacherInitials: string;
  readonly day: string;              // 'Lun'
  readonly time: string;             // '18:00'
  readonly courtName: string;
  readonly capacity: number;
  readonly roster: readonly RosterMember[];
  readonly waitlist: readonly WaitlistEntry[];
  /** Orden cronológico ASCENDENTE. De eso depende nextSessionDate(), que devuelve la
   *  primera 'scheduled' por orden de array. */
  readonly sessions: readonly GroupSession[];
}

export interface GroupsSnapshot {
  readonly clubId: string;
  readonly groups: readonly Group[];
}

export interface SaveAttendanceRequest {
  readonly groupId: string;
  readonly sessionId: string;
  readonly marks: readonly AttendanceMark[];
  readonly discountAbsences: boolean;   // política del club (checkbox del modal)
}
