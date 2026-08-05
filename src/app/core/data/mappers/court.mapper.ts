import { Court, CourtDraft } from '@domain/entities/court';
import { CourtDto, CourtRequest } from '../dto/courts.dto';

export function toCourt(dto: CourtDto): Court {
  return {
    id: dto.id,
    name: dto.name ?? '',
    code: dto.code,
    surfaceTypeId: dto.surfaceTypeId,
    indoor: dto.indoor ?? false,
    courtStatusId: dto.courtStatusId,
  };
}

/**
 * Los FK se OMITEN cuando son null. No es estilo: mandar `surfaceTypeId: null` hace que
 * courts.service ejecute BigInt(null), que tira TypeError y devuelve 500 (§4.5).
 *
 * Ojo con "unificar" esto con toCategoryRequest, que hace lo contrario a propósito.
 */
export function toCourtRequest(draft: CourtDraft): CourtRequest {
  return {
    name: draft.name,
    code: draft.code,
    indoor: draft.indoor,
    ...(draft.surfaceTypeId !== null ? { surfaceTypeId: draft.surfaceTypeId } : {}),
    ...(draft.courtStatusId !== null ? { courtStatusId: draft.courtStatusId } : {}),
  };
}
