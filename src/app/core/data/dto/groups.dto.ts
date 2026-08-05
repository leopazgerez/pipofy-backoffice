import * as v from 'valibot';

// snake_case = shape crudo del backend. El schema es la única fuente de verdad del tipo.
const SessionStatusDtoSchema = v.picklist(['prog', 'done', 'canc']);

const AttendanceMarkDtoSchema = v.object({
  member_id: v.string(),
  present: v.boolean(),
});

const RosterMemberDtoSchema = v.object({
  id: v.string(),
  name: v.string(),
  initials: v.string(),
  category: v.string(),
  credits: v.number(),
  attendance_rate: v.number(),
});

const WaitlistEntryDtoSchema = v.object({
  name: v.string(),
  initials: v.string(),
  since: v.string(),
});

const GroupSessionDtoSchema = v.object({
  id: v.string(),
  date: v.string(),
  time: v.string(),
  court_name: v.string(),
  status: SessionStatusDtoSchema,
  // nullable y NO optional: un campo opcional deja pasar un DTO al que el backend le olvidó
  // la asistencia. Siempre presente, null cuando no se tomó.
  attendance: v.nullable(v.array(AttendanceMarkDtoSchema)),
});

const GroupDtoSchema = v.object({
  id: v.string(),
  name: v.string(),
  category: v.string(),
  teacher: v.string(),
  teacher_initials: v.string(),
  day: v.string(),
  time: v.string(),
  court_name: v.string(),
  capacity: v.number(),
  roster: v.array(RosterMemberDtoSchema),
  waitlist: v.array(WaitlistEntryDtoSchema),
  sessions: v.array(GroupSessionDtoSchema),
});

export const GroupsDtoSchema = v.object({
  club_id: v.string(),
  groups: v.array(GroupDtoSchema),
});

export type GroupsDto = v.InferOutput<typeof GroupsDtoSchema>;
