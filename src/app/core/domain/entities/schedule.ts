import { InvalidScheduleError } from '../errors';
import { optionalInt } from '../optional-int';

/**
 * Una plantilla de horario: "los lunes de 18:00 a 19:30, en la cancha 1, el grupo
 * Cuarta/Quinta con el profe Díaz". De acá salen las ClassSession al generar.
 *
 * Casi todo es nullable porque el schema lo es: hay filas viejas sin día ni hora, y
 * generateSessions las saltea (`if (!template.startTime) continue`). La pantalla las
 * muestra con '—' en vez de esconderlas: existen, ocupan un id, y esconderlas haría que
 * el botón "Nuevo" pareciera crear duplicados.
 */
export interface Schedule {
  readonly id: string;
  readonly courtId: string;
  readonly coachId: string;
  readonly categoryGroupId: string;
  readonly sessionTypeId: string;
  /** 0 = Domingo … 6 = Sábado (§3.4). */
  readonly weekday: number | null;
  /** 'HH:mm' ya extraído del DateTime que manda el backend (§3.2). */
  readonly startTime: string | null;
  readonly endTime: string | null;
  readonly capacity: number | null;
  /** Decimal sin redondear, como string. El formateo es cosa de la pantalla. */
  readonly price: string | null;
  readonly active: boolean;
  /** 'YYYY-MM-DD', el formato que quiere <input type="date"> (§3.2). */
  readonly validFrom: string | null;
  readonly validTo: string | null;
}

export interface ScheduleDraft {
  readonly courtId: string;
  readonly coachId: string;
  readonly categoryGroupId: string;
  readonly sessionTypeId: string;
  readonly weekday: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly capacity: number | null;
  readonly price: string | null;
  readonly active: boolean;
  readonly validFrom: string | null;
  readonly validTo: string | null;
}

/** Lo que sale de los controles: todo string salvo el checkbox. */
export interface ScheduleInput {
  readonly courtId: string;
  readonly coachId: string;
  readonly categoryGroupId: string;
  readonly sessionTypeId: string;
  readonly weekday: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly capacity: string;
  readonly price: string;
  readonly active: boolean;
  readonly validFrom: string;
  readonly validTo: string;
}

/** 'HH:mm' de 00:00 a 23:59. <input type="time"> ya devuelve este formato o ''. */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
/** 'YYYY-MM-DD'. <input type="date"> ya devuelve este formato o ''. */
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function createScheduleDraft(input: ScheduleInput): ScheduleDraft {
  // Los cuatro FK son @IsString() SIN @IsOptional(), y también en el PATCH porque
  // UpdateScheduleDto reexporta CreateScheduleDto. El backend responde 400 sin decir cuál
  // falta: validar acá es lo que permite nombrarlo.
  if (input.courtId === '') throw new InvalidScheduleError('Elegí una cancha.');
  if (input.coachId === '') throw new InvalidScheduleError('Elegí un profesor.');
  if (input.categoryGroupId === '') throw new InvalidScheduleError('Elegí un grupo de categoría.');
  if (input.sessionTypeId === '') throw new InvalidScheduleError('Elegí un tipo de clase.');

  // El vacío se chequea ANTES de convertir, y no es una formalidad: Number('') es 0, que es
  // un weekday VÁLIDO (domingo, §3.4). Sin esta línea, un select sin elegir se guardaría
  // como un domingo en silencio.
  if (input.weekday.trim() === '') throw new InvalidScheduleError('Elegí un día de la semana.');
  const weekday = Number(input.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new InvalidScheduleError('Elegí un día de la semana.');
  }

  if (!HHMM.test(input.startTime)) throw new InvalidScheduleError('Poné una hora de inicio válida.');
  if (!HHMM.test(input.endTime)) throw new InvalidScheduleError('Poné una hora de fin válida.');
  // Comparación de strings, que sobre 'HH:mm' con cero a la izquierda ordena igual que las
  // horas ('09:30' < '18:00'). El backend NO valida esto (§3.6): un 20:00→18:00 se guarda,
  // y generateSessions crea sesiones con endAt < startAt que después no se pueden borrar.
  if (input.endTime <= input.startTime) {
    throw new InvalidScheduleError('La hora de fin tiene que ser posterior a la de inicio.');
  }

  const validFrom = input.validFrom === '' ? null : input.validFrom;
  const validTo = input.validTo === '' ? null : input.validTo;
  if (validFrom !== null && !YMD.test(validFrom)) {
    throw new InvalidScheduleError('La fecha "vigente desde" no es válida.');
  }
  if (validTo !== null && !YMD.test(validTo)) {
    throw new InvalidScheduleError('La fecha "vigente hasta" no es válida.');
  }
  // Mismo problema que createSessionGenerationDraft ya resuelve con assertRealDate: YMD sólo
  // valida la FORMA, y Date.parse rueda un día de mes imposible en silencio ('2026-02-30' →
  // '2026-03-02') en vez de dar NaN. Ambos son opcionales (el vacío ya se convirtió en null
  // arriba), así que el chequeo va sólo cuando hay valor.
  if (validFrom !== null) assertRealDate(validFrom, '"vigente desde"');
  if (validTo !== null) assertRealDate(validTo, '"vigente hasta"');
  // Igual que con las horas: comparación de strings sobre 'YYYY-MM-DD'.
  if (validFrom !== null && validTo !== null && validTo < validFrom) {
    throw new InvalidScheduleError('La vigencia "hasta" no puede ser anterior a "desde".');
  }

  return {
    courtId: input.courtId,
    coachId: input.coachId,
    categoryGroupId: input.categoryGroupId,
    sessionTypeId: input.sessionTypeId,
    weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    // OJO: optionalInt tira InvalidNumberError, NO InvalidScheduleError. Es el patrón que
    // ya usa plan.ts:52, y el test correspondiente tiene que assertear esa clase (§10).
    // El mensaje dice "0 o más" y no "positivo" porque el regex de optionalInt (/^\d+$/)
    // acepta '0': el texto de plan.ts dice "positivo" y es falso ahí también.
    capacity: optionalInt(input.capacity, 'El cupo tiene que ser un número entero de 0 o más.'),
    // String y no number: @IsNumberString() en el backend, un número JSON da 400 (§3.3).
    price: input.price.trim() || null,
    active: input.active,
    validFrom,
    validTo,
  };
}

export interface SessionGenerationInput {
  readonly from: string;
  readonly to: string;
}

export interface SessionGenerationDraft {
  readonly from: string;
  readonly to: string;
}

export interface SessionGenerationResult {
  readonly created: number;
  readonly skipped: number;
}

/**
 * El techo del rango, en días inclusive. El backend no acota nada y no existe ningún
 * endpoint que borre una ClassSession (§3.11): una vez generadas, quedan. Sesenta días son
 * dos meses, que es más de lo que un club planifica de una sentada.
 *
 * Vive en el dominio y no en el componente a propósito: es una regla sobre la operación,
 * no sobre la pantalla. Si el botón se muda, el límite se muda con él.
 */
export const MAX_GENERATION_DAYS = 60;

/** Días inclusive entre dos 'YYYY-MM-DD'. UTC para que el horario de verano no la corra. */
function inclusiveDays(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return ms / 86_400_000 + 1;
}

/**
 * Confirma que 'YYYY-MM-DD' sea una fecha real, no sólo con la forma correcta. Date.parse NO
 * devuelve NaN con un día de mes imposible dentro de un mes que existe: '2026-02-30' rueda en
 * silencio a '2026-03-02', así que el chequeo de NaN solo no alcanza. La única forma de
 * detectarlo es la vuelta: reserializar el resultado y compararlo contra lo que entró.
 */
function assertRealDate(ymd: string, label: string): void {
  const ms = Date.parse(`${ymd}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== ymd) {
    throw new InvalidScheduleError(`La fecha ${label} no es una fecha real.`);
  }
}

export function createSessionGenerationDraft(input: SessionGenerationInput): SessionGenerationDraft {
  if (!YMD.test(input.from)) throw new InvalidScheduleError('Elegí la fecha de inicio.');
  if (!YMD.test(input.to)) throw new InvalidScheduleError('Elegí la fecha de fin.');
  // Antes de comparar los strings entre sí: así el mensaje puede nombrar CUÁL de las dos
  // fechas es la imposible, en vez de caer en el "anterior" genérico de más abajo.
  assertRealDate(input.from, 'de inicio');
  assertRealDate(input.to, 'de fin');
  if (input.to < input.from) {
    throw new InvalidScheduleError('La fecha de fin no puede ser anterior a la de inicio.');
  }

  const days = inclusiveDays(input.from, input.to);
  // Con las dos fechas ya confirmadas reales por assertRealDate, este NaN es inalcanzable en
  // la práctica. Se deja como red de seguridad barata: si el día de mañana se reordena el
  // código de arriba, esta línea sigue evitando que `NaN > 60` (que es false) deje pasar un
  // rango imposible en silencio.
  if (!Number.isFinite(days)) {
    throw new InvalidScheduleError('Alguna de las fechas no es válida.');
  }
  if (days > MAX_GENERATION_DAYS) {
    throw new InvalidScheduleError(
      `El rango no puede superar los ${MAX_GENERATION_DAYS} días: las clases generadas no se pueden borrar.`,
    );
  }
  return { from: input.from, to: input.to };
}
