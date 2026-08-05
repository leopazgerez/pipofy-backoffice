import { InvalidCategoryError } from '../errors';

export interface Category {
  readonly id: string;
  /** Puede ser '' — el backend acepta categorías sin nombre (§4.6). */
  readonly name: string;
  readonly levelOrder: number | null;
}

export interface CategoryDraft {
  readonly name: string;
  readonly levelOrder: number | null;
}

export interface CategoryInput {
  readonly name: string;
  /** '' cuando el usuario deja el campo vacío — el orden es opcional. */
  readonly levelOrder: string;
}

export function createCategoryDraft(input: CategoryInput): CategoryDraft {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new InvalidCategoryError('El nombre de la categoría es obligatorio.');
  }

  const rawOrder = input.levelOrder.trim();
  if (rawOrder.length === 0) {
    return { name, levelOrder: null };
  }

  const levelOrder = Number(rawOrder);
  if (!Number.isInteger(levelOrder) || levelOrder < 0) {
    throw new InvalidCategoryError('El orden de nivel tiene que ser un número entero de 0 en adelante.');
  }
  return { name, levelOrder };
}
