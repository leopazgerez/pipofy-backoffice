import { Hold } from '@domain/entities/dashboard-snapshot';

// $248.500 — pesos es-AR, sin decimales (el mockup no muestra centavos).
export function formatArs(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('es-AR');
}

// 174 -> "2:54". Segundos con padding a 2 dígitos.
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return m + ':' + String(s).padStart(2, '0');
}

// Un "tick" de la cuenta regresiva: descuenta un segundo y descarta los vencidos.
// Puro (no muta la entrada) para testearlo sin timers; el contenedor lo llama cada 1 s.
export function tickHolds(holds: Hold[]): Hold[] {
  return holds
    .map((h) => ({ ...h, expiresInSeconds: h.expiresInSeconds - 1 }))
    .filter((h) => h.expiresInSeconds > 0);
}
