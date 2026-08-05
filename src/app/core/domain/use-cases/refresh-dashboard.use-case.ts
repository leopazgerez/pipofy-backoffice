import { DashboardRepository } from '../contracts/dashboard.repository';
import { ClubRepository } from '../contracts/club.repository';
import { DashboardSnapshot } from '../entities/dashboard-snapshot';
import { ClubInactiveError } from '../errors';

// Earns its existence: composes two repos + validates a domain invariant.
export class RefreshDashboard {
  constructor(
    private readonly dashboards: DashboardRepository,
    private readonly clubs: ClubRepository,
  ) {}

  async execute(clubId: string): Promise<DashboardSnapshot> {
    if (!(await this.clubs.isActive(clubId))) throw new ClubInactiveError(clubId);
    return this.dashboards.getSnapshot(clubId);
  }
}
