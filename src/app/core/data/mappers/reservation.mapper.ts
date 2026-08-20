import { Reservation } from '@domain/entities/reservation';
import { ReservationDto } from '../dto/class-session.dto';

export function toReservation(dto: ReservationDto): Reservation {
  return { id: dto.id, holdExpiresAt: dto.holdExpiresAt };
}
