import { DashboardDto } from '../dto/dashboard.dto';

// Datos demo del dashboard operativo (portados de index-v2.html). Editables sin tocar la
// lógica del repo. Cuando exista el backend, este archivo desaparece y HttpDashboardRepository
// trae el mismo shape desde la API.
//
// Nota: el KPI "sesiones hoy" (18 / 24 canchas) es un total del club; la grilla siembra 4
// canchas de muestra. Ambos números vienen del mockup, no es un bug de consistencia.
export const DASHBOARD_SEED: DashboardDto = {
  club_id: 'c1',
  kpis: {
    sessions_today: 18,
    courts_total: 24,
    occupancy_pct: 86,
    revenue_today_cents: 24_850_000, // $248.500
  },
  grid: {
    courts: [
      { name: 'Cancha 1', surface: 'padel', meta: 'Pádel · Diego A.' },
      { name: 'Cancha 2', surface: 'padel', meta: 'Pádel · Sofía M.' },
      { name: 'Cancha 3', surface: 'padel', meta: 'Pádel · turno libre' },
      { name: 'Central', surface: 'tenis', meta: 'Tenis · Diego A.' },
    ],
    hours: ['16:00', '17:00', '18:00', '19:00', '20:00'],
    sessions: [
      [
        { category: '8va', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' },
        { category: '6ta', professor: 'Sofía M.', initials: 'S', occupied: 3, capacity: 4, state: 'open' },
        null,
        { category: 'Iniciación', professor: 'Diego A.', initials: 'D', occupied: 2, capacity: 3, state: 'open' },
      ],
      [
        { category: '7ma', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' },
        null,
        { category: 'Libre', professor: 'Rot.', initials: 'R', occupied: 5, capacity: 6, state: 'open' },
        { category: 'Comp.', professor: 'Sofía M.', initials: 'S', occupied: 2, capacity: 2, state: 'full' },
      ],
      [
        { category: '7ma+8va', professor: 'Diego A.', initials: 'D', occupied: 3, capacity: 4, state: 'open' },
        { category: '6ta', professor: 'Sofía M.', initials: 'S', occupied: 4, capacity: 4, state: 'wait' },
        null,
        { category: 'Nivelación', professor: 'Diego A.', initials: 'D', occupied: 3, capacity: 4, state: 'open' },
      ],
      [
        { category: '5ta', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' },
        { category: '7ma', professor: 'Sofía M.', initials: 'S', occupied: 4, capacity: 4, state: 'wait' },
        { category: 'Libre', professor: 'Rot.', initials: 'R', occupied: 4, capacity: 6, state: 'open' },
        null,
      ],
      [
        { category: 'Damas', professor: 'Sofía M.', initials: 'S', occupied: 3, capacity: 4, state: 'open' },
        { category: 'Comp.', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' },
        null,
        { category: 'Priv.', professor: 'Sofía M.', initials: 'S', occupied: 1, capacity: 2, state: 'open' },
      ],
    ],
  },
  holds: [
    { id: 'h1', name: 'Bruno Torres', session: '7ma · C2 · 18:00', expires_in_seconds: 174 },
    { id: 'h2', name: 'Ana Giménez', session: '6ta · C1 · 19:00', expires_in_seconds: 352 },
    { id: 'h3', name: 'Pablo Ruiz', session: 'Nivel. · Central', expires_in_seconds: 521 },
  ],
  waitlist: [
    { id: 'w1', title: '7ma+8va · Cancha 2 · 18:00', meta: '3 en espera · cupo lleno' },
    { id: 'w2', title: 'Nivelación · Central · 19:00', meta: '1 en espera · requiere aprobar' },
  ],
  transfers: [
    { id: 't1', name: 'Bruno Torres', plan: 'Pack Mensual 8', amount_cents: 9_600_000 },   // $96.000
    { id: 't2', name: 'Camila Sosa', plan: 'Clase Privada x4', amount_cents: 12_000_000 }, // $120.000
    { id: 't3', name: 'Ezequiel Paz', plan: 'Intensivo Nivel.', amount_cents: 5_400_000 }, // $54.000
  ],
};
