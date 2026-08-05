import * as v from 'valibot';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { CancelSessionRequest, CourtSession, DashboardSnapshot } from '@domain/entities/dashboard-snapshot';
import { SessionNotFoundError } from '@domain/errors';
import { DashboardDtoSchema } from '../dto/dashboard.dto';
import { toDashboardSnapshot } from '../mappers/dashboard.mapper';
import { DASHBOARD_SEED } from './dashboard.seed';

const SIMULATED_LATENCY_MS = 600;

// ponytail: mock en memoria para la demo visual sin backend. Valida la semilla con el mismo
// schema que usaría el HTTP real (ejercita el borde DTO→entidad) y la devuelve con una latencia
// simulada. Se bindea por useFactory (ver dashboard.providers.ts).
//
// SIN @Injectable(): con `strictInjectionParameters: true` el compilador Angular exige un token
// DI para CADA parámetro del constructor de una clase @Injectable(), y `number` (latencyMs) no
// es un token válido (NG2003). Como se construye a mano en la factory, no hace falta el decorador.
export class InMemoryDashboardRepository implements DashboardRepository {
  // Estado VIVO del demo: se siembra UNA sola vez y las mutaciones persisten mientras viva la
  // instancia. Antes se re-parseaba la semilla en cada getSnapshot(), así que una cancelación
  // sólo afectaba al snapshot efímero y la sesión reaparecía en la lectura siguiente.
  private snapshot: DashboardSnapshot = toDashboardSnapshot(v.parse(DashboardDtoSchema, DASHBOARD_SEED));

  constructor(private readonly latencyMs: number = SIMULATED_LATENCY_MS) {}

  getSnapshot(_clubId: string): Promise<DashboardSnapshot> {
    return this.delay(this.snapshot);
  }

  cancelSession(_clubId: string, req: CancelSessionRequest): Promise<DashboardSnapshot> {
    const ci = this.snapshot.grid.courts.findIndex((c) => c.name === req.courtName);
    const hi = this.snapshot.grid.hours.indexOf(req.hour);
    // Guard obligatorio: sin él, findIndex === -1 → sessions[-1][ci] → TypeError, no DomainError.
    if (ci === -1 || hi === -1 || !this.snapshot.grid.sessions[hi][ci]) {
      return Promise.reject(new SessionNotFoundError(req.courtName, req.hour));
    }
    // Liberar el cupo = el slot queda vacío. Es el paso 1 del flujo de la maqueta.
    this.snapshot = {
      ...this.snapshot,
      grid: { ...this.snapshot.grid, sessions: this.replaceAt(hi, ci, null) },
    };
    return this.delay(this.snapshot);
  }

  /** Copia inmutable de la matriz de sesiones con [hi][ci] reemplazado. */
  private replaceAt(hi: number, ci: number, value: CourtSession | null): (CourtSession | null)[][] {
    return this.snapshot.grid.sessions.map((row, r) =>
      r === hi ? row.map((cell, c) => (c === ci ? value : cell)) : row,
    );
  }

  // El setTimeout es incondicional a propósito, incluso con latencyMs 0. Cambiarlo por
  // Promise.resolve() cuando es 0 PARECE que dejaría a los specs usar sólo whenStable(),
  // pero se probó y rompe 4 tests: whenStable() no drena la cola de microtareas hasta
  // agotarla, y la cadena load()→run()→setData()→then() no está registrada en PendingTasks.
  // Lo que los destraba es el límite de MACROTAREA (el flushRepo de los specs), no que el
  // repo resuelva antes. Ver la nota de flushRepo en dashboard-page.component.spec.ts.
  private delay<T>(value: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(value), this.latencyMs));
  }
}
