import { Coach } from '@domain/entities/coach';
import { Court } from '@domain/entities/court';
import { CategoryGroup } from '@domain/entities/category-group';
import {
  CourtSession,
  DashboardSnapshot,
  WaitlistEntry,
} from '@domain/entities/dashboard-snapshot';
import { occupancyPercent } from '@domain/occupancy';
import { catalogLabel } from '@data/catalog-labels';
import { CatalogItem } from '../dto/catalogs.dto';
import { ClassSessionDto } from '../dto/class-session.dto';

/**
 * El dashboard no tiene endpoint agregador: el snapshot se ensambla en el front desde cinco
 * fuentes (spec §5.2). Esta función es pura y recibe `today` por parámetro justamente para
 * poder testear el filtro de fecha sin tocar el reloj.
 */
export interface DashboardSources {
  readonly clubId: string;
  readonly courts: readonly Court[];
  readonly coaches: readonly Coach[];
  readonly categoryGroups: readonly CategoryGroup[];
  readonly surfaceTypes: readonly CatalogItem[];
  readonly sessions: readonly ClassSessionDto[];
  /** sessionId → cuántos esperan. Sólo trae las sesiones llenas que se consultaron. */
  readonly waitingCounts: ReadonlyMap<string, number>;
  readonly today: Date;
}

/**
 * 'YYYY-MM-DD' en hora LOCAL.
 *
 * NO usar toISOString(): eso da la fecha en UTC y reintroduce exactamente el bug que este
 * filtro existe para tapar (spec §3.2). Se exporta porque el repositorio arma la ventana
 * from/to con la misma noción de "hoy".
 */
export function localDateKey(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * ¿Este `startAt` crudo del backend cae en `todayKey`, en hora LOCAL?
 *
 * Es la definición única de "es de hoy", y existe porque hacen falta dos consumidores: este
 * mapper, al armar la grilla, y `HttpDashboardRepository.fetchWaitingCounts`, que decide a qué
 * sesiones pedirles la lista de espera. Escrito dos veces, ya había divergido una vez.
 *
 * Tolera `null` y basura porque `startAt` es nullable en Prisma y nadie lo valida del otro lado.
 * No avisa por consola a propósito: el mapper distingue el motivo del descarte y lo reporta él.
 */
export function isOnLocalDate(startAt: string | null, todayKey: string): boolean {
  if (startAt === null) return false;
  const at = new Date(startAt);
  return !Number.isNaN(at.getTime()) && localDateKey(at) === todayKey;
}

function localHhMm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function courtMeta(court: Court, surfaceOf: ReadonlyMap<string, string>): string {
  const surfaceName = court.surfaceTypeId === null ? undefined : surfaceOf.get(court.surfaceTypeId);
  const parts = [
    surfaceName !== undefined ? catalogLabel(surfaceName) : null,
    court.indoor ? 'Techada' : 'Descubierta',
  ];
  return parts.filter((p): p is string => p !== null).join(' · ');
}

export function toDashboardSnapshot(src: DashboardSources): DashboardSnapshot {
  const courtById = new Map(src.courts.map((c, i) => [c.id, { column: i, name: c.name }]));
  const surfaceOf = new Map(src.surfaceTypes.map((s) => [s.id, s.name]));
  const coachOf = new Map(src.coaches.map((c) => [c.id, c.displayName]));
  const groupOf = new Map(src.categoryGroups.map((g) => [g.id, g.name]));
  const todayKey = localDateKey(src.today);

  // 1. Filtro de fecha local. El backend interpreta from/to como UTC literal, así que el
  //    repositorio pide ±1 día y el recorte fino se hace acá.
  const todays: { readonly dto: ClassSessionDto; readonly hhmm: string; readonly at: Date }[] = [];
  for (const dto of src.sessions) {
    if (dto.startAt === null) {
      console.warn(`[dashboard] sesión ${dto.id} sin startAt: se descarta`);
      continue;
    }
    const at = new Date(dto.startAt);
    if (Number.isNaN(at.getTime())) {
      console.warn(
        `[dashboard] sesión ${dto.id} con startAt inválido (${dto.startAt}): se descarta`,
      );
      continue;
    }
    // La comparación es la misma que hace isOnLocalDate(); acá se escribe con `at` ya
    // parseado porque el loop lo necesita igual y distingue POR QUÉ descarta, para avisar.
    if (localDateKey(at) !== todayKey) continue;
    todays.push({ dto, hhmm: localHhMm(at), at });
  }

  // Orden cronológico: hace que la celda la gane la primera sesión que se escribe, sin
  // ninguna estructura auxiliar que mantener en sincronía. `sort` es estable desde ES2019,
  // así que dos sesiones con el mismo startAt conservan el orden en que las mandó la API.
  todays.sort((a, b) => a.at.getTime() - b.at.getTime());

  // 2. Filas: horas locales distintas, ascendentes. Sin sesiones, grilla vacía.
  const hours = [...new Set(todays.map(({ hhmm }) => hhmm))].sort();
  const rowOf = new Map(hours.map((h, i) => [h, i]));

  // 3. Celdas.
  const sessions: (CourtSession | null)[][] = hours.map(() => src.courts.map(() => null));
  /**
   * Las sesiones que EFECTIVAMENTE entraron a la grilla. Sólo éstas alimentan la lista de
   * espera: una sesión descartada por cancha desconocida o por colisión de slot no se ve en
   * ningún lado, y listarla en el rail sería ofrecer una fila que no lleva a nada — encima
   * con el nombre de cancha vacío.
   */
  const placed: { readonly dto: ClassSessionDto; readonly hhmm: string; readonly court: string }[] =
    [];

  for (const { dto, hhmm } of todays) {
    const court = courtById.get(dto.courtId);
    if (court === undefined) {
      // Pasa de verdad: CourtsRepository filtra los borrados pero /class-sessions no (§3.5).
      console.warn(
        `[dashboard] sesión ${dto.id} en cancha desconocida ${dto.courtId}: se descarta`,
      );
      continue;
    }
    const ci = court.column;
    const ri = rowOf.get(hhmm);
    if (ri === undefined) continue; // imposible: la hora salió de este mismo set

    if (sessions[ri][ci] !== null) {
      // ponytail: una celda = una sesión, y gana la más temprana porque `todays` viene
      // ordenado. La salida de fondo es que la celda sea una lista, no antes de que un club
      // real tenga solapamientos.
      console.warn(
        `[dashboard] slot ${hhmm}/${dto.courtId} ya ocupado: se descarta la sesión ${dto.id}`,
      );
      continue;
    }

    const capacity = dto.capacity ?? 0;
    const waiting = src.waitingCounts.get(dto.id) ?? 0;
    sessions[ri][ci] = {
      id: dto.id,
      category: groupOf.get(dto.categoryGroupId) ?? '',
      professor: coachOf.get(dto.coachId) ?? '',
      occupied: capacity - dto.availableSpots,
      capacity,
      state: dto.availableSpots > 0 ? 'open' : waiting > 0 ? 'wait' : 'full',
    };
    placed.push({ dto, hhmm, court: court.name });
  }

  // 4. KPIs sobre las sesiones de hoy, hayan entrado a la grilla o no.
  let occupiedSum = 0;
  let capacitySum = 0;
  for (const { dto } of todays) {
    const capacity = dto.capacity ?? 0;
    capacitySum += capacity;
    occupiedSum += capacity - dto.availableSpots;
  }

  // 5. Lista de espera: una entrada por sesión VISIBLE con gente esperando.
  const waitlist: WaitlistEntry[] = [];
  for (const { dto, hhmm, court } of placed) {
    const n = src.waitingCounts.get(dto.id) ?? 0;
    if (n === 0) continue;
    waitlist.push({
      id: dto.id,
      title: `${groupOf.get(dto.categoryGroupId) ?? ''} · ${court} · ${hhmm}`,
      meta: `${n} en espera · cupo lleno`,
    });
  }

  return {
    clubId: src.clubId,
    kpis: {
      sessionsToday: todays.length,
      courtsTotal: src.courts.length,
      occupancyPct: occupancyPercent(occupiedSum, capacitySum),
    },
    grid: {
      courts: src.courts.map((c) => ({ name: c.name, meta: courtMeta(c, surfaceOf) })),
      hours,
      sessions,
    },
    waitlist,
  };
}
