import { Category, CategoryDraft } from '@domain/entities/category';
import { CategoryDto, CategoryRequest } from '../dto/categories.dto';

export function toCategory(dto: CategoryDto): Category {
  return {
    id: dto.id,
    name: dto.name ?? '',
    levelOrder: dto.levelOrder,
  };
}

/**
 * levelOrder se manda tal cual, null incluido: es la única forma de limpiarlo (omitirlo
 * le daría `undefined` a Prisma, que no toca el campo). Es seguro porque categories.service
 * no lo pasa por BigInt().
 *
 * NO unificar con toCourtRequest: ahí los FK se omiten porque el null devuelve 500.
 */
export function toCategoryRequest(draft: CategoryDraft): CategoryRequest {
  return {
    name: draft.name,
    levelOrder: draft.levelOrder,
  };
}
