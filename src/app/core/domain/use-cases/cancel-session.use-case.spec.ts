import { describe, it, expect } from 'vitest';
import { CancelSession } from './cancel-session.use-case';
import { DashboardRepository } from '../contracts/dashboard.repository';
import { CancelSessionRequest, DashboardSnapshot } from '../entities/dashboard-snapshot';

const snapshot: DashboardSnapshot = {
  clubId: 'c1',
  kpis: { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86, revenueTodayCents: 24_850_000 },
  grid: { courts: [], hours: [], sessions: [] },
  holds: [],
  waitlist: [],
  transfers: [],
};

const req: CancelSessionRequest = { courtName: 'Cancha 1', hour: '18:00', reason: 'lluvia' };

describe('CancelSession', () => {
  it('delega en el repo y devuelve el snapshot actualizado', async () => {
    const calls: [string, CancelSessionRequest][] = [];
    class FakeDashboards extends DashboardRepository {
      getSnapshot = async () => snapshot;
      cancelSession = async (clubId: string, r: CancelSessionRequest) => {
        calls.push([clubId, r]);
        return snapshot;
      };
    }
    const uc = new CancelSession(new FakeDashboards());
    expect(await uc.execute('c1', req)).toEqual(snapshot);
    expect(calls).toEqual([['c1', req]]);
  });

  it('propaga el error del repo sin envolverlo', async () => {
    const boom = new Error('boom');
    class FailingDashboards extends DashboardRepository {
      getSnapshot = async () => snapshot;
      cancelSession = async () => { throw boom; };
    }
    const uc = new CancelSession(new FailingDashboards());
    await expect(uc.execute('c1', req)).rejects.toBe(boom);
  });
});
