/**
 * Etiqueta legible de la mano hábil. La tabla y el `<select>` del modal la formateaban por
 * separado con la misma expresión: acá viven las dos, para que el día que "diestro" tenga que
 * mostrarse distinto no queden dos pantallas diciendo cosas distintas.
 *
 * Vive en la feature y no en `domain/` porque es presentación, no una regla del negocio —
 * mismo criterio que `configuracion/planes/plan-price.ts` y `configuracion/catalog-labels.ts`.
 *
 * ponytail: capitaliza y listo, porque los tres valores de DOMINANT_HANDS ya son las palabras
 * que se muestran. Si aparece un valor cuya etiqueta no sea su propio nombre, esto pasa a ser
 * un mapa explícito como el de catalog-labels.ts.
 */
export function dominantHandLabel(hand: string | null): string {
  if (!hand) return '—';
  return hand.charAt(0).toUpperCase() + hand.slice(1);
}
