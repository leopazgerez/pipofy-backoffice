import { Coach, CoachDraft } from '@domain/entities/coach';
import { CoachDto, CoachRequest } from '../dto/coaches.dto';

export function toCoach(dto: CoachDto): Coach {
  const nombre = dto.user?.nombre ?? '';
  const apellido = dto.user?.apellido ?? '';
  // El trim() colapsa el caso de un solo campo cargado: "Juan " → "Juan".
  const fullName = `${nombre} ${apellido}`.trim();
  return {
    id: dto.id,
    // Cadena de fallback: getOne() no incluye `user` (§3.8) y los tres campos son nullables.
    // Un select con opciones vacías es inusable, así que siempre hay algo que mostrar.
    displayName: fullName || dto.user?.email || `Profe #${dto.id}`,
    description: dto.description,
  };
}

/** Un solo campo y sin omisiones: `description` es String? y el service la pasa cruda a
 *  Prisma, así que el null la vacía de verdad (§3.10). */
export function toCoachRequest(draft: CoachDraft): CoachRequest {
  return { description: draft.description };
}
