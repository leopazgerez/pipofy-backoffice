/**
 * 'yyyy-MM-dd' en hora LOCAL. La única definición de "qué día es hoy" del proyecto.
 *
 * NO usar toISOString(): eso da la fecha en UTC, y en Argentina (UTC-3) todo lo que pase
 * después de las 21:00 cae en el día siguiente. Ese bug ya apareció dos veces: en la ventana
 * from/to del dashboard y en el filtro de la grilla.
 *
 * Vive en `domain` y no en `shared` porque `data` también la usa y no puede importar de
 * `shared` (boundaries). Mismo motivo y mismo lugar que occupancy.ts.
 */
export function localDateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
