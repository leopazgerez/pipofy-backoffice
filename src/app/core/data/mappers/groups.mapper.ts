import { GroupsDto } from '../dto/groups.dto';
import { AttendanceMark, GroupSession, GroupsSnapshot, SessionStatus } from '@domain/entities/group';

const STATUS: Record<GroupsDto['groups'][number]['sessions'][number]['status'], SessionStatus> = {
  prog: 'scheduled',
  done: 'completed',
  canc: 'cancelled',
};

export function toGroupsSnapshot(dto: GroupsDto): GroupsSnapshot {
  return {
    clubId: dto.club_id,
    groups: dto.groups.map((g) => ({
      id: g.id,
      name: g.name,
      category: g.category,
      teacher: g.teacher,
      teacherInitials: g.teacher_initials,
      day: g.day,
      time: g.time,
      courtName: g.court_name,
      capacity: g.capacity,
      roster: g.roster.map((r) => ({
        id: r.id,
        name: r.name,
        initials: r.initials,
        category: r.category,
        credits: r.credits,
        attendanceRate: r.attendance_rate,
      })),
      waitlist: g.waitlist.map((w) => ({ name: w.name, initials: w.initials, since: w.since })),
      sessions: g.sessions.map((s) => toSession(g.id, s)),
    })),
  };
}

function toSession(groupId: string, s: GroupsDto['groups'][number]['sessions'][number]): GroupSession {
  const status = STATUS[s.status];
  const attendance: readonly AttendanceMark[] | null =
    s.attendance === null ? null : s.attendance.map((m) => ({ memberId: m.member_id, present: m.present }));

  // GUARD DE LA INVARIANTE (entities/group.ts): attendance !== null ⟺ status === 'completed'.
  // Va acá, en el borde de datos, porque el schema valibot no puede expresar una condición
  // entre dos campos. Sin este guard, un 'completed' sin marcas llega hasta el modal, que
  // arranca el modo editar leyendo attendance y se encuentra un null.
  if ((status === 'completed') !== (attendance !== null)) {
    throw new Error(
      `Invariante de GroupSession violada en ${groupId}/${s.id}: status '${status}' con attendance ${attendance === null ? 'null' : 'no nula'}.`,
    );
  }

  return { id: s.id, date: s.date, time: s.time, courtName: s.court_name, status, attendance };
}
