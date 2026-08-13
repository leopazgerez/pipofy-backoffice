/**
 * '2026-08-01T00:00:00.000Z' → '2026-08-01', que es lo que quiere `<input type="date">` y lo
 * que comparan las reglas de vencimiento del dominio.
 *
 * Con regex y no `slice(0, 10)`: ante un string que no tenga forma de fecha, slice devuelve
 * un prefijo cualquiera —diez caracteres de basura que después se comparan como si fueran una
 * fecha— y esto devuelve null, que las pantallas ya saben mostrar como '—'.
 *
 * Estaba escrito cuatro veces entre schedule.mapper y student.mapper.
 */
export function toYmd(raw: string | null): string | null {
  if (raw === null) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw);
  return m === null ? null : m[1];
}
