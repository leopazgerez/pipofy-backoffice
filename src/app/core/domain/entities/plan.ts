import { InvalidPlanError } from '../errors';
import { optionalInt } from '../optional-int';

export interface Plan {
  readonly id: string;
  /** Puede ser '' — el backend acepta planes sin nombre. */
  readonly name: string;
  readonly planTypeId: string;
  readonly coachId: string | null;
  readonly classCount: number | null;
  /** Decimal sin redondear, como string. El formateo es cosa de la pantalla. */
  readonly price: string | null;
  readonly validityDays: number | null;
  readonly active: boolean;
}

export interface PlanDraft {
  readonly name: string;
  readonly planTypeId: string;
  readonly coachId: string | null;
  readonly classCount: number | null;
  readonly price: string | null;
  readonly validityDays: number | null;
  readonly active: boolean;
}

/** Lo que sale de los controles: los selects vacíos dan '', los type=number dan string. */
export interface PlanInput {
  readonly name: string;
  readonly planTypeId: string;
  readonly coachId: string;
  readonly classCount: string;
  readonly price: string;
  readonly validityDays: string;
  readonly active: boolean;
}

export function createPlanDraft(input: PlanInput): PlanDraft {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new InvalidPlanError('El nombre del plan es obligatorio.');
  }
  // planTypeId es @IsString() sin @IsOptional() también en el PATCH (§3.4): sin esto el
  // backend responde 400 con un mensaje que no dice cuál es el campo.
  if (input.planTypeId === '') {
    throw new InvalidPlanError('Elegí un tipo de plan.');
  }
  return {
    name,
    planTypeId: input.planTypeId,
    coachId: input.coachId || null,
    classCount: optionalInt(input.classCount, 'La cantidad de clases tiene que ser un número entero positivo.'),
    // String y no number: @IsNumberString() en el backend, un número JSON da 400 (§3.5).
    price: input.price.trim() || null,
    validityDays: optionalInt(input.validityDays, 'Los días de validez tienen que ser un número entero positivo.'),
    active: input.active,
  };
}
