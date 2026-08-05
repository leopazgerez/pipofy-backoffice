import { Club, ClubDraft } from '@domain/entities/club';
import { ClubDto, ClubRequest } from '../dto/clubs.dto';

export function toClub(dto: ClubDto): Club {
  return {
    id: dto.id,
    name: dto.name ?? '',
    phone: dto.phone,
    address: dto.address,
    usesLeveling: dto.usesLeveling,
    holdMinutes: dto.holdMinutes,
    transferAlias: dto.transferAlias,
    // El backend no expone `active`: se deriva del soft delete, igual que el filtro de las
    // listas (§3.1). Es lo único que lee RefreshDashboard.
    active: dto.deletedAt === null,
  };
}

/**
 * Sin omisiones ni casos especiales: los seis campos viajan siempre. Es el único write-path
 * de toda la API donde eso alcanza, porque los cuatro nullables se vacían con null de
 * verdad (§3.8).
 *
 * Ojo con "unificar" esto con toScheduleRequest: ese OMITE validFrom/validTo, porque ahí el
 * null no vacía sino que se convierte en `undefined` (§3.7). Cada mapper tiene un test que
 * fija su regla justamente para que el refactor "limpio" rompa en rojo y no en producción.
 */
export function toClubRequest(draft: ClubDraft): ClubRequest {
  return {
    name: draft.name,
    phone: draft.phone,
    address: draft.address,
    usesLeveling: draft.usesLeveling,
    holdMinutes: draft.holdMinutes,
    transferAlias: draft.transferAlias,
  };
}
