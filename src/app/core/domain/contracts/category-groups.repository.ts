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

  /**
   * IDEMPOTENTES POR CONTRATO: `addItem` no falla si la categoría ya estaba, y `removeItem`
   * no falla si no estaba. En los dos casos el estado final es el que se pidió.
   *
   * No es cosmético. Ningún GET del backend devuelve los items de un grupo
   * (`CategoryGroupsService.list()` y `getOne()` son findMany/findUnique pelados), así que la
   * pantalla no puede leer la asignación y trabaja con una pista guardada en el navegador.
   * Que "ya estaba" y "no estaba" cuenten como éxito es lo que hace que esa pista se corrija
   * sola con cada click en vez de quedar mintiendo para siempre.
   *
   * ponytail: el navegador es la única fuente de verdad de la asignación. Techo real: dos
   * encargados editando el mismo grupo desde dos navegadores divergen sin que nadie se entere.
   * Salida: `include: { items: { include: { category: true } } }` en el `list()` y el
   * `getOne()` de category-groups del backend.
   */
  abstract addItem(groupId: string, categoryId: string): Promise<void>;
  abstract removeItem(groupId: string, categoryId: string): Promise<void>;
}
