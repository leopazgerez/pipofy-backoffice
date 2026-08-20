/**
 * Minutos que le quedan al hold. Pura y con `now` por parámetro: así se testea sin tocar el
 * reloj ni usar timers falsos, igual que el resto de la lógica de fechas del proyecto.
 *
 * Redondea hacia ARRIBA para que un hold recién creado muestre los 30 minutos completos.
 */
export function minutosRestantes(holdExpiresAt: string | null, now: Date): number {
  if (holdExpiresAt === null) return 0;
  const at = new Date(holdExpiresAt);
  if (Number.isNaN(at.getTime())) return 0;
  return Math.max(0, Math.ceil((at.getTime() - now.getTime()) / 60_000));
}
