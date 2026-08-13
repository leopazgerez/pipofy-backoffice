/**
 * Porcentaje de ocupación, 0..100. Sirve tanto para un KPI como para el ancho de una barra.
 *
 * El guard de `capacity` no es defensivo de más: evita el `NaN%` de `Math.round(0/0*100)`, que
 * sale de verdad con un club sin clases hoy y con una `ClassSession` cuya capacidad el backend
 * dejó en null (`capacity` es `Int?` y el mapper la normaliza a 0).
 *
 * El clamp a [0, 100] es del RANGO DE SALIDA, no un maquillaje de los datos de entrada: el
 * resultado alimenta un `[style.width.%]`, y un porcentaje negativo es una declaración CSS
 * inválida que el navegador descarta dejando el ancho anterior — una barra que miente en vez
 * de una que se ve mal. Los números crudos (`3/4`) se muestran sin tocar a propósito: si el
 * backend devolviera `availableSpots > capacity`, la celda tiene que delatarlo.
 *
 * Vive en `domain` —y no al lado de alguno de sus consumidores— porque es el único lugar que
 * los tres pueden alcanzar sin violar los boundaries: lo usan el mapper del dashboard (`data`),
 * la grilla de canchas (`features/dashboard`) y la ficha de grupos (`features/grupos`), y ni
 * `data` puede importar de una feature ni una feature de otra.
 */
export function occupancyPercent(occupied: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((occupied / capacity) * 100)));
}
