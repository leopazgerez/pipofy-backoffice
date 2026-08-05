import { CategoryGroup, CategoryGroupDraft } from '../entities/category-group';

/**
 * Clase abstracta a propósito: hace de token DI sin arrastrar @angular/core al dominio.
 *
 * Sin `clubId`: el backend lo resuelve del JWT. Las escrituras devuelven void y la facade
 * re-lee: parchear la lista en memoria ahorra una llamada trivial y agrega una vía de
 * desincronización.
 */
export abstract class CategoryGroupsRepository {
  abstract list(): Promise<CategoryGroup[]>;
  abstract create(draft: CategoryGroupDraft): Promise<void>;
  abstract update(id: string, draft: CategoryGroupDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
