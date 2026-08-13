import { describe, it, expect } from 'vitest';
import { RefreshDashboard } from './refresh-dashboard.use-case';
import { ClubInactiveError } from '../errors';
import { DashboardRepository } from '../contracts/dashboard.repository';
import { ClubRepository } from '../contracts/club.repository';
import { DashboardSnapshot } from '../entities/dashboard-snapshot';

const snapshot: DashboardSnapshot = {
  clubId: 'c1',
  kpis: { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86 },
  grid: { courts: [], hours: [], sessions: [] },
  waitlist: [],
};

class FakeDashboards extends DashboardRepository {
  getSnapshot = async () => snapshot;
}

describe('RefreshDashboard', () => {
  it('devuelve el snapshot cuando el club está activo', async () => {
    // Sólo isActive: es lo único que RefreshDashboard usa. El cast es a propósito —
    // completar las ocho propiedades de un Club acá sería ruido que no prueba nada.
    const clubs = { isActive: async () => true } as unknown as ClubRepository;
    const uc = new RefreshDashboard(new FakeDashboards(), clubs);
    expect(await uc.execute('c1')).toEqual(snapshot);
  });

  it('tira ClubInactiveError cuando el club está inactivo', async () => {
    const clubs = { isActive: async () => false } as unknown as ClubRepository;
    const uc = new RefreshDashboard(new FakeDashboards(), clubs);
    await expect(uc.execute('c1')).rejects.toBeInstanceOf(ClubInactiveError);
  });
});
