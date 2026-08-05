import { InvalidClubError } from '../errors';

/**
 * Los datos del club. `active` sale de `deletedAt === null` (§3.9) y es lo único que lee
 * RefreshDashboard; el resto lo usa sólo la pantalla de Configuración → Club.
 */
export interface Club {
  readonly id: string;
  /** Puede ser '' — la columna es String? y el backend acepta un club sin nombre. */
  readonly name: string;
  readonly phone: string | null;
  readonly address: string | null;
  readonly usesLeveling: boolean;
  readonly holdMinutes: number;
  readonly transferAlias: string | null;
  readonly active: boolean;
}

/**
 * Los cuatro strings van EN null cuando están vacíos, y eso los vacía de verdad: es la
 * única entidad de esta API donde limpiar funciona en TODOS sus campos nullables (§3.8).
 * Los otros dos nunca son null: sus columnas no lo aceptan y un null sería un 500.
 */
export interface ClubDraft {
  readonly name: string | null;
  readonly phone: string | null;
  readonly address: string | null;
  readonly usesLeveling: boolean;
  readonly holdMinutes: number;
  readonly transferAlias: string | null;
}

/** Lo que sale de los controles: el type=number da string, el checkbox da boolean. */
export interface ClubInput {
  readonly name: string;
  readonly phone: string;
  readonly address: string;
  readonly usesLeveling: boolean;
  readonly holdMinutes: string;
  readonly transferAlias: string;
}

export function createClubDraft(input: ClubInput): ClubDraft {
  const raw = input.holdMinutes.trim();
  const holdMinutes = Number(raw);
  // El backend valida @IsInt() @Min(1) y responde 400 sin nombrar el campo; validar acá
  // permite decir cuál es. No se usa optionalInt(): ese devuelve null en el vacío, y acá el
  // vacío no es una opción — la columna es Int NOT NULL con default 30 (§3.8).
  if (raw === '' || !Number.isInteger(holdMinutes) || holdMinutes < 1) {
    throw new InvalidClubError('Los minutos de reserva tienen que ser un número entero de 1 o más.');
  }

  return {
    name: input.name.trim() || null,
    phone: input.phone.trim() || null,
    address: input.address.trim() || null,
    usesLeveling: input.usesLeveling,
    holdMinutes,
    transferAlias: input.transferAlias.trim() || null,
  };
}
