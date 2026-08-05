import { Category, CategoryDraft } from '../entities/category';

/** Mismas razones que CourtsRepository: clase abstracta como token DI, sin clubId (§4.9),
 *  escrituras que devuelven void porque la facade re-lee (§5.2). */
export abstract class CategoriesRepository {
  abstract list(): Promise<Category[]>;
  abstract create(draft: CategoryDraft): Promise<void>;
  abstract update(id: string, draft: CategoryDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
