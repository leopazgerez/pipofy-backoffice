import { describe, it, expect } from 'vitest';
import { of, throwError, Observable } from 'rxjs';
import { HttpDashboardRepository } from './http-dashboard.repository';
import { ApiClient } from '../http/api-client';

function makeRepo(apiGet: (path: string) => Observable<unknown>) {
  const api = { get: apiGet } as unknown as ApiClient;
  return new HttpDashboardRepository(api);
}

const dto = {
  club_id: 'c1',
  kpis: { sessions_today: 18, courts_total: 24, occupancy_pct: 86, revenue_today_cents: 24_850_000 },
  grid: { courts: [], hours: [], sessions: [] },
  holds: [],
  waitlist: [],
  transfers: [],
};

const entity = {
  clubId: 'c1',
  kpis: { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86, revenueTodayCents: 24_850_000 },
  grid: { courts: [], hours: [], sessions: [] },
  holds: [],
  waitlist: [],
  transfers: [],
};

describe('HttpDashboardRepository.getSnapshot', () => {
  it('pide la ruta del snapshot y mapea el payload a la entidad de dominio', async () => {
    let path = '';
    const repo = makeRepo((p) => { path = p; return of(dto); });
    expect(await repo.getSnapshot('c1')).toEqual(entity);
    expect(path).toBe('/clubs/c1/snapshot');
  });

  it('rechaza con un DomainError de validación cuando el payload deriva', async () => {
    const repo = makeRepo(() => of({ club_id: 'c1' })); // faltan kpis/grid/...
    await expect(repo.getSnapshot('c1')).rejects.toMatchObject({ kind: 'validation' });
  });

  it('propaga un DomainError not-found del ApiClient', async () => {
    const repo = makeRepo(() => throwError(() => ({ kind: 'not-found' })));
    await expect(repo.getSnapshot('c1')).rejects.toEqual({ kind: 'not-found' });
  });
});
