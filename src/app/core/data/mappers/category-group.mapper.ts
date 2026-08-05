import { CategoryGroup, CategoryGroupDraft } from '@domain/entities/category-group';
import { CategoryGroupDto, CategoryGroupRequest } from '../dto/category-groups.dto';

export function toCategoryGroup(dto: CategoryGroupDto): CategoryGroup {
  return {
    id: dto.id,
    name: dto.name ?? '',
  };
}

/**
 * El único mapper de request de este slice sin reglas raras de null: `name` siempre viaja
 * con contenido.
 *
 * Ojo con "unificarlo" con toPlanRequest o toStudentRequest: esos DOS omiten claves
 * cuando son null, y cada uno omite unas distintas, a propósito.
 */
export function toCategoryGroupRequest(draft: CategoryGroupDraft): CategoryGroupRequest {
  return { name: draft.name };
}
