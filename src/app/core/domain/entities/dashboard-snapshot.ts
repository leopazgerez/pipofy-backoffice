export type Surface = 'padel' | 'tenis';
export type SessionState = 'full' | 'open' | 'wait';

export interface Kpis {
  sessionsToday: number;
  courtsTotal: number;
  occupancyPct: number;
  revenueTodayCents: number;
}

export interface Court {
  name: string;
  surface: Surface;
  meta: string;
}

export interface CourtSession {
  category: string;
  professor: string;
  initials: string;
  occupied: number;
  capacity: number;
  state: SessionState;
}

export interface CourtGrid {
  courts: Court[];                       // columnas
  hours: string[];                       // filas
  sessions: (CourtSession | null)[][];   // [horaIndex][canchaIndex]; null = slot vacío
}

export interface Hold {
  id: string;
  name: string;
  session: string;
  expiresInSeconds: number;
}

export interface WaitlistEntry {
  id: string;
  title: string;
  meta: string;
}

export interface PendingTransfer {
  id: string;
  name: string;
  plan: string;
  amountCents: number;
}

export interface DashboardSnapshot {
  clubId: string;
  kpis: Kpis;
  grid: CourtGrid;
  holds: Hold[];
  waitlist: WaitlistEntry[];
  transfers: PendingTransfer[];
}

export type CancelReason = 'profesor' | 'lluvia' | 'incompleto' | 'otro';

/**
 * Identidad de una sesión = courtName + hour.
 *
 * CourtSession es la ÚNICA entidad del snapshot sin `id` propio (Hold,
 * WaitlistEntry y PendingTransfer sí lo tienen), así que ésta es la única
 * identidad posible. INVARIANTE DEL CONTRATO: `grid.courts[].name` y
 * `grid.hours[]` son únicos dentro de una grilla. Nada en el schema lo
 * garantiza — hoy se cumple porque la semilla lo respeta. Si un backend real
 * devolviera duplicados, la cancelación ambiguaría sobre el primer match.
 * Darle `id` a CourtSession es la solución de fondo (deuda anotada, spec §16.4).
 */
export interface CancelSessionRequest {
  readonly courtName: string;   // identifica la columna
  readonly hour: string;        // identifica la fila
  readonly reason: CancelReason;
}
