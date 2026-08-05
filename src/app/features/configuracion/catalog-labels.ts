/**
 * Los catálogos llegan con el `name` crudo del seed, en snake_case (§4.8), y no se puede
 * mostrar `polvo_ladrillo` en un select.
 *
 * El mapa es explícito porque el humanizador genérico no acierta ni el "de" de "polvo de
 * ladrillo" ni la tilde de "sintético". El fallback existe para que un valor nuevo del
 * seed se vea aceptable en vez de romper.
 */
const CATALOG_LABELS: Record<string, string> = {
  polvo_ladrillo: 'Polvo de ladrillo',
  cemento: 'Cemento',
  sintetico: 'Sintético',
  disponible: 'Disponible',
  mantenimiento: 'En mantenimiento',
  inactiva: 'Inactiva',
  mensual_grupal: 'Mensual grupal',
  individual: 'Individual',
  nivelacion: 'Nivelación',
};

export function catalogLabel(name: string): string {
  return CATALOG_LABELS[name] ?? name.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
}
