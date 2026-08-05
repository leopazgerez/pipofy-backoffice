import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { toDashboardSnapshot, toCancelSessionDto } from './dashboard.mapper';
import { DashboardDto, CancelSessionDtoSchema } from '../dto/dashboard.dto';

const dto: DashboardDto = {
  club_id: 'c1',
  kpis: { sessions_today: 18, courts_total: 24, occupancy_pct: 86, revenue_today_cents: 24_850_000 },
  grid: {
    courts: [{ name: 'Cancha 1', surface: 'padel', meta: 'Pádel · Diego A.' }],
    hours: ['16:00'],
    sessions: [[{ category: '8va', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' }, null]],
  },
  holds: [{ id: 'h1', name: 'Bruno Torres', session: '7ma · C2 · 18:00', expires_in_seconds: 174 }],
  waitlist: [{ id: 'w1', title: '7ma+8va · Cancha 2 · 18:00', meta: '3 en espera · cupo lleno' }],
  transfers: [{ id: 't1', name: 'Bruno Torres', plan: 'Pack Mensual 8', amount_cents: 9_600_000 }],
};

describe('toDashboardSnapshot', () => {
  it('mapea el DTO snake_case a la entidad camelCase (incluye sesión null)', () => {
    expect(toDashboardSnapshot(dto)).toEqual({
      clubId: 'c1',
      kpis: { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86, revenueTodayCents: 24_850_000 },
      grid: {
        courts: [{ name: 'Cancha 1', surface: 'padel', meta: 'Pádel · Diego A.' }],
        hours: ['16:00'],
        sessions: [[{ category: '8va', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' }, null]],
      },
      holds: [{ id: 'h1', name: 'Bruno Torres', session: '7ma · C2 · 18:00', expiresInSeconds: 174 }],
      waitlist: [{ id: 'w1', title: '7ma+8va · Cancha 2 · 18:00', meta: '3 en espera · cupo lleno' }],
      transfers: [{ id: 't1', name: 'Bruno Torres', plan: 'Pack Mensual 8', amountCents: 9_600_000 }],
    });
  });
});

describe('toCancelSessionDto', () => {
  it('convierte camelCase del dominio a snake_case del wire', () => {
    expect(toCancelSessionDto({ courtName: 'Cancha 2', hour: '18:00', reason: 'lluvia' }))
      .toEqual({ court_name: 'Cancha 2', hour: '18:00', reason: 'lluvia' });
  });

  it('produce un DTO que valida contra su schema (convención: v.parse antes de salir)', () => {
    const dto = toCancelSessionDto({ courtName: 'Central', hour: '20:00', reason: 'incompleto' });
    expect(() => v.parse(CancelSessionDtoSchema, dto)).not.toThrow();
  });
});
