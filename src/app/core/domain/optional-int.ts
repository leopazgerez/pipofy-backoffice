import { InvalidNumberError } from './errors';

/**
 * '' → null (vaciar el campo es válido). '12' → 12. Cualquier otra cosa tira.
 *
 * El backend valida @IsInt() y responde 400 sin nombrar el campo; validar acá permite
 * decir cuál es. Sólo enteros no negativos: ninguno de los tres campos que la usan
 * (classCount, validityDays, ranking) tiene sentido en negativo.
 *
 * Nota: <input type="number"> ya devuelve '' cuando el usuario tipea algo que no es un
 * número, así que la basura pura llega como null, no como error. Esta función atrapa lo
 * que el input SÍ acepta y el backend no: los decimales y los negativos.
 */
export function optionalInt(raw: string, message: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!/^\d+$/.test(trimmed)) throw new InvalidNumberError(message);
  return Number(trimmed);
}
