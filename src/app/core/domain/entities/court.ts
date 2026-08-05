import { InvalidCourtError } from '../errors';

export interface Court {
  readonly id: string;
  /** Puede ser '' — el backend acepta canchas sin nombre (§4.6) y hay que tolerarlas al leer. */
  readonly name: string;
  readonly code: string | null;
  readonly surfaceTypeId: string | null;
  readonly indoor: boolean;
  readonly courtStatusId: string | null;
}

/** Lo que el formulario produce. Sin `id`: el alta y la edición mandan el mismo cuerpo. */
export interface CourtDraft {
  readonly name: string;
  readonly code: string | null;
  readonly surfaceTypeId: string | null;
  readonly indoor: boolean;
  readonly courtStatusId: string | null;
}

/** Lo que sale de los controles del form: los selects vacíos dan '', no null. */
export interface CourtInput {
  readonly name: string;
  readonly code: string;
  readonly surfaceTypeId: string;
  readonly indoor: boolean;
  readonly courtStatusId: string;
}

/**
 * La invariante corre SÓLO en escritura. `Court` no la exige porque el backend ya pudo
 * haber guardado filas sin nombre (§4.6) y la lista tiene que poder mostrarlas.
 */
export function createCourtDraft(input: CourtInput): CourtDraft {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new InvalidCourtError('El nombre de la cancha es obligatorio.');
  }
  return {
    name,
    code: input.code.trim() || null,
    surfaceTypeId: input.surfaceTypeId || null,
    indoor: input.indoor,
    courtStatusId: input.courtStatusId || null,
  };
}
