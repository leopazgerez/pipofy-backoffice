import { ClassSession } from '@domain/entities/class-session';
import { WaitingListEntry } from '@domain/entities/waiting-list';
import { ClassSessionDto, WaitingListEntryDto } from '../dto/class-session.dto';

export function toClassSession(dto: ClassSessionDto): ClassSession {
  return {
    id: dto.id,
    courtId: dto.courtId,
    coachId: dto.coachId,
    categoryGroupId: dto.categoryGroupId,
    startAt: dto.startAt,
    // Nullable en Prisma; normalizado acá para que ninguna pantalla tenga que decidirlo.
    capacity: dto.capacity ?? 0,
    availableSpots: dto.availableSpots,
  };
}

export function toWaitingListEntry(dto: WaitingListEntryDto): WaitingListEntry {
  return { id: dto.id, studentId: dto.studentId, requestedAt: dto.requestedAt };
}
