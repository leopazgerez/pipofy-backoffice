import { InvalidCategoryGroupError } from '../errors';

export interface CategoryGroup {
  readonly id: string;
  /** Puede ser '' — el backend acepta grupos sin nombre y hay que tolerarlos al leer. */
  readonly name: string;
}

/** Lo que el formulario produce. Sin `id`: el alta y la edición mandan el mismo cuerpo. */
export interface CategoryGroupDraft {
  readonly name: string;
}

export interface CategoryGroupInput {
  readonly name: string;
}

/**
 * La invariante corre SÓLO en escritura, igual que en Court: el backend ya pudo haber
 * guardado grupos sin nombre y la lista tiene que poder mostrarlos.
 *
 * El nombre es obligatorio aunque el backend lo acepte null porque un grupo sin nombre es
 * inelegible en el select de Horarios (slice B): no habría qué mostrar en la opción.
 */
export function createCategoryGroupDraft(input: CategoryGroupInput): CategoryGroupDraft {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new InvalidCategoryGroupError('El nombre del grupo es obligatorio.');
  }
  return { name };
}
