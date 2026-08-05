/**
 * "12000.5" → "$12.001". Redondea a pesos, igual que formatArs en el dashboard.
 *
 * No se reutiliza formatArs: vive en features/dashboard y eslint-plugin-boundaries prohíbe
 * que una feature importe de otra. Además toma centavos y acá el precio viene en pesos.
 *
 * El fallback de "no es un número" existe porque el precio llega de un Decimal de Prisma
 * cuya serialización no se pudo verificar (§3.5): mostrar el crudo es más útil que "$NaN".
 */
export function formatPlanPrice(price: string | null): string {
  if (price === null) return '—';
  const n = Number(price);
  if (!Number.isFinite(n)) return price;
  return '$' + Math.round(n).toLocaleString('es-AR');
}
