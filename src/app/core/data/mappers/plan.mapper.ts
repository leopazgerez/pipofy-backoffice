import { Plan, PlanDraft } from '@domain/entities/plan';
import { PlanDto, PlanRequest } from '../dto/plans.dto';

export function toPlan(dto: PlanDto): Plan {
  return {
    id: dto.id,
    name: dto.name ?? '',
    planTypeId: dto.planTypeId,
    coachId: dto.coachId,
    classCount: dto.classCount,
    // String() y no un cast: el DTO acepta number por la incertidumbre del §3.5.
    price: dto.price === null ? null : String(dto.price),
    validityDays: dto.validityDays,
    active: dto.active,
  };
}

/**
 * `coachId` se OMITE cuando es null (BigInt(null) → 500). El resto se manda EN null,
 * porque es la única forma de vaciarlo: omitirlo le da a Prisma `undefined`, que significa
 * "no toques este campo", y el valor viejo sobreviviría en silencio.
 *
 * Ojo con "unificar" esto con toStudentRequest: ese omite DOS claves distintas
 * (categoryId y birthDate), y por motivos distintos. Cada mapper tiene un test que fija su
 * regla justamente para que el refactor "limpio" rompa en rojo y no en producción.
 */
export function toPlanRequest(draft: PlanDraft): PlanRequest {
  return {
    name: draft.name,
    planTypeId: draft.planTypeId,
    classCount: draft.classCount,
    price: draft.price,
    validityDays: draft.validityDays,
    active: draft.active,
    ...(draft.coachId !== null ? { coachId: draft.coachId } : {}),
  };
}
