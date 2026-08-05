import { CancelSessionDto, DashboardDto } from '../dto/dashboard.dto';
import { CancelSessionRequest, DashboardSnapshot } from '@domain/entities/dashboard-snapshot';

export function toDashboardSnapshot(dto: DashboardDto): DashboardSnapshot {
  return {
    clubId: dto.club_id,
    kpis: {
      sessionsToday: dto.kpis.sessions_today,
      courtsTotal: dto.kpis.courts_total,
      occupancyPct: dto.kpis.occupancy_pct,
      revenueTodayCents: dto.kpis.revenue_today_cents,
    },
    grid: {
      courts: dto.grid.courts.map((c) => ({ name: c.name, surface: c.surface, meta: c.meta })),
      hours: dto.grid.hours,
      sessions: dto.grid.sessions.map((row) =>
        row.map((s) =>
          s === null
            ? null
            : {
                category: s.category,
                professor: s.professor,
                initials: s.initials,
                occupied: s.occupied,
                capacity: s.capacity,
                state: s.state,
              },
        ),
      ),
    },
    holds: dto.holds.map((h) => ({ id: h.id, name: h.name, session: h.session, expiresInSeconds: h.expires_in_seconds })),
    waitlist: dto.waitlist.map((w) => ({ id: w.id, title: w.title, meta: w.meta })),
    transfers: dto.transfers.map((t) => ({ id: t.id, name: t.name, plan: t.plan, amountCents: t.amount_cents })),
  };
}

/** Dirección de IDA: entidad camelCase → wire snake_case. */
export function toCancelSessionDto(req: CancelSessionRequest): CancelSessionDto {
  return { court_name: req.courtName, hour: req.hour, reason: req.reason };
}
