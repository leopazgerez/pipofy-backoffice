/**
 * Sin create ni delete: en este slice los profesores son de SÓLO LECTURA salvo por
 * `description`, que el slice B agrega abajo con Draft e Input.
 *
 * Crear un profesor es imposible contra este backend: el coachProfile lo crea POST /users
 * cuando el rol se llama 'profesor', y ese endpoint exige un roleId que no hay forma de
 * obtener porque no existe GET /roles (§3.10).
 */
export interface Coach {
  readonly id: string;
  /** Nombre y apellido, o el email, o un placeholder: los tres campos son nullables. */
  readonly displayName: string;
  readonly description: string | null;
}

/** Lo que emite el modal. Un solo campo, pero con la misma forma que los otros modales. */
export interface CoachInput {
  readonly description: string;
}

export interface CoachDraft {
  readonly description: string | null;
}

/**
 * '' → null. La regla parece del componente pero es de la API: `description` es String? y
 * mandarla en null es la única forma de vaciarla — @IsOptional() deja pasar el null y
 * coaches.service la pasa cruda a Prisma (§3.10). Vive acá para que el día que haya un
 * segundo consumidor no queden dos criterios de qué significa "sin descripción".
 */
export function createCoachDraft(input: CoachInput): CoachDraft {
  return { description: input.description.trim() || null };
}
