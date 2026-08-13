export type SessionState = 'full' | 'open' | 'wait';

export interface Kpis {
  sessionsToday: number;
  courtsTotal: number;
  occupancyPct: number;
}

export interface Court {
  name: string;
  /**
   * 'Cemento · Techada'. Ya formateado por el mapper: la superficie sale del catálogo y el
   * techado de `indoor`. Sin superficie cargada, queda sólo el techado.
   *
   * No hay campo `surface` con el DEPORTE: el modelo del backend no tiene forma de saber si
   * una cancha es de pádel o de tenis — `SurfaceType` es material de piso, no deporte
   * (spec §4). Cuando exista el dato, vuelve.
   */
  meta: string;
}

export interface CourtSession {
  /** Id real de ClassSession. */
  id: string;
  category: string;
  professor: string;
  occupied: number;
  /** Puede ser 0: `ClassSession.capacity` es nullable y el mapper lo normaliza (spec §3.3). */
  capacity: number;
  state: SessionState;
}

export interface CourtGrid {
  courts: Court[]; // columnas
  hours: string[]; // filas
  sessions: (CourtSession | null)[][]; // [horaIndex][canchaIndex]; null = slot vacío
}

export interface WaitlistEntry {
  id: string;
  title: string;
  meta: string;
}

export interface DashboardSnapshot {
  clubId: string;
  kpis: Kpis;
  grid: CourtGrid;
  waitlist: WaitlistEntry[];
}
