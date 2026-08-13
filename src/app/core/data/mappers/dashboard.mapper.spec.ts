import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import { toDashboardSnapshot, DashboardSources } from './dashboard.mapper';
import { Court } from '@domain/entities/court';
import { ClassSessionDto } from '../dto/class-session.dto';

/**
 * El spy se instala y se restaura por hook y no dentro de cada `it`: con `mockRestore()` al
 * final del test, una aserción que falla antes se lleva puesto el restore y deja `console.warn`
 * mockeado para todo lo que sigue — un test rojo se convierte en una cascada de tests que ven
 * un spy con historial ajeno.
 */
let warn: MockInstance<typeof console.warn>;
beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => {
  warn.mockRestore();
});

// 05/08/2026 a las 12:00 hora LOCAL. Todos los casos se apoyan en esta fecha.
const TODAY = new Date(2026, 7, 5, 12, 0, 0);

/** Un startAt en hora local, para no tener que razonar el offset en cada caso. */
const at = (h: number, m = 0, day = 5) => new Date(2026, 7, day, h, m, 0).toISOString();

const session = (over: Partial<ClassSessionDto> = {}): ClassSessionDto => ({
  id: '10',
  courtId: '1',
  coachId: '2',
  categoryGroupId: '3',
  startAt: at(18),
  capacity: 4,
  availableSpots: 1,
  ...over,
});

const court = (over: Partial<Court> = {}): Court => ({
  id: '1',
  name: 'Cancha 1',
  code: 'C1',
  surfaceTypeId: '9',
  indoor: true,
  courtStatusId: '1',
  ...over,
});

const sources = (over: Partial<DashboardSources> = {}): DashboardSources => ({
  clubId: 'c1',
  courts: [court()],
  coaches: [{ id: '2', displayName: 'Diego A.', description: null }],
  categoryGroups: [{ id: '3', name: '7ma' }],
  surfaceTypes: [{ id: '9', name: 'cemento' }],
  sessions: [session()],
  waitingCounts: new Map(),
  today: TODAY,
  ...over,
});

describe('toDashboardSnapshot — columnas y meta', () => {
  it('arma meta con superficie legible y techado', () => {
    const snap = toDashboardSnapshot(sources());
    expect(snap.grid.courts).toEqual([{ name: 'Cancha 1', meta: 'Cemento · Techada' }]);
  });

  it('sin superficie cargada, meta queda sólo con el techado', () => {
    const courts = [court({ surfaceTypeId: null, indoor: false })];
    const snap = toDashboardSnapshot(sources({ courts }));
    expect(snap.grid.courts[0].meta).toBe('Descubierta');
  });
});

describe('toDashboardSnapshot — filtro de fecha local', () => {
  it('incluye una sesión de las 22:00 hora local', () => {
    // El caso que rompe el bug §3.2: pedimos ±1 día porque el backend interpreta la ventana
    // en UTC, y acá filtramos por fecha local. Sin esto se perderían las clases nocturnas.
    const snap = toDashboardSnapshot(sources({ sessions: [session({ startAt: at(22) })] }));
    expect(snap.grid.hours).toEqual(['22:00']);
    expect(snap.kpis.sessionsToday).toBe(1);
  });

  it('incluye una sesión de las 00:30 hora local', () => {
    // Caso simétrico de borde del día local (00:30 vs. 22:00 arriba), no de la dirección del
    // offset UTC: con TZ fijada a America/Argentina/Buenos_Aires (UTC-3, test-setup.ts), las
    // 00:30 locales son las 03:30Z del MISMO día UTC, así que esto no ejercita nada que el
    // caso de las 22:00 no ejercite ya. La dirección UTC+ (madrugada cayéndose de la ventana)
    // sólo se ejercitaría con otra TZ fijada.
    const snap = toDashboardSnapshot(sources({ sessions: [session({ startAt: at(0, 30) })] }));
    expect(snap.grid.hours).toEqual(['00:30']);
    expect(snap.kpis.sessionsToday).toBe(1);
  });

  it('descarta las sesiones de ayer y de mañana', () => {
    const snap = toDashboardSnapshot(
      sources({
        sessions: [
          session({ id: 'a', startAt: at(22, 0, 4) }),
          session({ id: 'b', startAt: at(9, 0, 6) }),
        ],
      }),
    );
    expect(snap.kpis.sessionsToday).toBe(0);
    expect(snap.grid.hours).toEqual([]);
  });

  it('descarta las sesiones sin startAt', () => {
    const snap = toDashboardSnapshot(sources({ sessions: [session({ startAt: null })] }));
    expect(snap.kpis.sessionsToday).toBe(0);
    expect(warn).toHaveBeenCalled();
  });
});

describe('toDashboardSnapshot — celdas', () => {
  it('mapea la sesión a su celda resolviendo cancha, profe y categoría', () => {
    const snap = toDashboardSnapshot(sources());
    expect(snap.grid.sessions[0][0]).toEqual({
      id: '10',
      category: '7ma',
      professor: 'Diego A.',
      occupied: 3,
      capacity: 4,
      state: 'open',
    });
  });

  it('deja null el slot sin sesión', () => {
    const courts = [court(), court({ id: '2', name: 'Cancha 2' })];
    const snap = toDashboardSnapshot(sources({ courts }));
    expect(snap.grid.sessions[0][1]).toBeNull();
  });

  it('normaliza capacity null a 0', () => {
    // El backend calcula availableSpots = max(0, 0 − ocupados) = 0 cuando capacity es null.
    const snap = toDashboardSnapshot(
      sources({ sessions: [session({ capacity: null, availableSpots: 0 })] }),
    );
    expect(snap.grid.sessions[0][0]).toMatchObject({ occupied: 0, capacity: 0, state: 'full' });
  });

  it('descarta la sesión de una cancha desconocida', () => {
    // Pasa de verdad: /courts filtra los borrados en su repo pero /class-sessions no (§3.5).
    const snap = toDashboardSnapshot(sources({ sessions: [session({ courtId: '99' })] }));
    expect(snap.grid.sessions[0][0]).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it('ante dos sesiones en el mismo slot se queda con la más temprana', () => {
    // Mismo courtId y mismo HH:mm ⇒ misma celda. Los segundos las diferencian sin sacarlas
    // de la fila '18:00', que es lo que hace falta para forzar la colisión.
    const tarde = new Date(2026, 7, 5, 18, 0, 30).toISOString();
    const temprano = new Date(2026, 7, 5, 18, 0, 0).toISOString();

    const snap = toDashboardSnapshot(
      sources({
        sessions: [
          session({ id: 'tarde', startAt: tarde }),
          session({ id: 'temprano', startAt: temprano }),
        ],
      }),
    );

    expect(snap.grid.hours).toEqual(['18:00']);
    expect(snap.grid.sessions[0][0]?.id).toBe('temprano');
    expect(warn).toHaveBeenCalled();
  });

  it('dos sesiones en la misma cancha a horas distintas ocupan filas distintas', () => {
    // El contracaso: sin él, un mapper que descarte por cancha en vez de por slot pasaría
    // el test de arriba igual.
    const snap = toDashboardSnapshot(
      sources({
        sessions: [session({ id: 'a', startAt: at(18) }), session({ id: 'b', startAt: at(19) })],
      }),
    );
    expect(snap.grid.hours).toEqual(['18:00', '19:00']);
    expect(snap.grid.sessions[0][0]?.id).toBe('a');
    expect(snap.grid.sessions[1][0]?.id).toBe('b');
  });
});

describe('toDashboardSnapshot — estados', () => {
  it('open cuando quedan lugares', () => {
    expect(toDashboardSnapshot(sources()).grid.sessions[0][0]?.state).toBe('open');
  });

  it('full cuando no quedan lugares ni lista de espera', () => {
    const snap = toDashboardSnapshot(sources({ sessions: [session({ availableSpots: 0 })] }));
    expect(snap.grid.sessions[0][0]?.state).toBe('full');
  });

  it('wait cuando no quedan lugares y hay gente esperando', () => {
    const snap = toDashboardSnapshot(
      sources({
        sessions: [session({ availableSpots: 0 })],
        waitingCounts: new Map([['10', 3]]),
      }),
    );
    expect(snap.grid.sessions[0][0]?.state).toBe('wait');
  });
});

describe('toDashboardSnapshot — KPIs', () => {
  it('calcula ocupación redondeada', () => {
    // 3 de 4 ocupados = 75%.
    expect(toDashboardSnapshot(sources()).kpis.occupancyPct).toBe(75);
  });

  it('devuelve 0 y no NaN cuando la capacidad total es 0', () => {
    const snap = toDashboardSnapshot(
      sources({ sessions: [session({ capacity: 0, availableSpots: 0 })] }),
    );
    expect(snap.kpis.occupancyPct).toBe(0);
  });

  it('courtsTotal cuenta las canchas, no las sesiones', () => {
    expect(toDashboardSnapshot(sources()).kpis.courtsTotal).toBe(1);
  });
});

describe('toDashboardSnapshot — lista de espera', () => {
  it('arma una entrada por sesión con gente esperando', () => {
    const snap = toDashboardSnapshot(
      sources({
        sessions: [session({ availableSpots: 0 })],
        waitingCounts: new Map([['10', 3]]),
      }),
    );
    expect(snap.waitlist).toEqual([
      { id: '10', title: '7ma · Cancha 1 · 18:00', meta: '3 en espera · cupo lleno' },
    ]);
  });

  it('no lista las sesiones sin espera', () => {
    expect(toDashboardSnapshot(sources()).waitlist).toEqual([]);
  });

  it('no lista una sesión que la grilla descartó por cancha desconocida', () => {
    // Si el rail la listara, sería una fila que no lleva a ninguna celda visible — y con el
    // nombre de cancha vacío entre dos separadores, porque la cancha no está en /courts.
    const snap = toDashboardSnapshot(
      sources({
        sessions: [session({ courtId: '99', availableSpots: 0 })],
        waitingCounts: new Map([['10', 3]]),
      }),
    );
    expect(snap.grid.sessions[0][0]).toBeNull();
    expect(snap.waitlist).toEqual([]);
  });

  it('no lista dos veces el mismo slot cuando hubo colisión', () => {
    // La perdedora de la colisión no se ve en la grilla: listarla duplicaría el título.
    const snap = toDashboardSnapshot(
      sources({
        sessions: [
          session({
            id: 'temprano',
            startAt: new Date(2026, 7, 5, 18, 0, 0).toISOString(),
            availableSpots: 0,
          }),
          session({
            id: 'tarde',
            startAt: new Date(2026, 7, 5, 18, 0, 30).toISOString(),
            availableSpots: 0,
          }),
        ],
        waitingCounts: new Map([
          ['temprano', 2],
          ['tarde', 5],
        ]),
      }),
    );
    expect(snap.waitlist).toEqual([
      { id: 'temprano', title: '7ma · Cancha 1 · 18:00', meta: '2 en espera · cupo lleno' },
    ]);
  });
});
