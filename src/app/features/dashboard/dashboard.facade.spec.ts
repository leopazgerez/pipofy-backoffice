import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardFacade } from './dashboard.facade';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { ClubRepository } from '@domain/contracts/club.repository';
import { CancelSessionRequest, DashboardSnapshot } from '@domain/entities/dashboard-snapshot';

const snapshot: DashboardSnapshot = {
  clubId: 'c1',
  kpis: { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86, revenueTodayCents: 24_850_000 },
  grid: { courts: [], hours: [], sessions: [] },
  holds: [],
  waitlist: [],
  transfers: [],
};

function setup(active = true, cancelImpl: () => Promise<DashboardSnapshot> = async () => snapshot) {
  const dashboards: DashboardRepository = {
    getSnapshot: async () => snapshot,
    cancelSession: cancelImpl,
  };
  // Sólo isActive: es lo único que RefreshDashboard usa (ver refresh-dashboard.use-case.spec.ts).
  const clubs = { isActive: async () => active } as unknown as ClubRepository;
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      DashboardFacade,
      { provide: DashboardRepository, useValue: dashboards },
      { provide: ClubRepository, useValue: clubs },
    ],
  });
  return TestBed.inject(DashboardFacade);
}

describe('DashboardFacade', () => {
  it('carga un snapshot en data()', async () => {
    const f = setup(true);
    await f.load('c1');
    expect(f.data()).toEqual(snapshot);
    expect(f.error()).toBeNull();
  });

  it('captura un DomainError cuando el club está inactivo', async () => {
    const f = setup(false);
    await f.load('c1');
    expect(f.data()).toBeNull();
    expect(f.error()?.kind).toBe('domain'); // ClubInactiveError -> toDomainError -> {kind:'domain'}
  });

  describe('cancel', () => {
    const req: CancelSessionRequest = { courtName: 'Cancha 1', hour: '18:00', reason: 'lluvia' };

    it('publica el snapshot devuelto en data()', async () => {
      const actualizado: DashboardSnapshot = { ...snapshot, kpis: { ...snapshot.kpis, sessionsToday: 17 } };
      const f = setup(true, async () => actualizado);
      await f.cancel('c1', req);
      expect(f.data()).toEqual(actualizado);
    });

    it('NO toca loading() — si lo hiciera, la página entera parpadearía a "Cargando panel…"', async () => {
      const f = setup(true);
      await f.load('c1');
      const p = f.cancel('c1', req);
      expect(f.loading()).toBe(false);   // en pleno vuelo
      await p;
      expect(f.loading()).toBe(false);
    });

    it('al fallar NO toca error() ni data(), y propaga al llamador', async () => {
      const boom = new Error('boom');
      const f = setup(true, async () => { throw boom; });
      await f.load('c1');

      await expect(f.cancel('c1', req)).rejects.toBe(boom);

      // La trampa gemela: setError() blanquearía el dashboard entero vía la rama
      // @else if (error()) del template, aunque data() siguiera poblado.
      expect(f.error()).toBeNull();
      expect(f.data()).toEqual(snapshot);
    });
  });
});
