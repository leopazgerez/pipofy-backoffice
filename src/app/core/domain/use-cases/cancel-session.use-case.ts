import { DashboardRepository } from '../contracts/dashboard.repository';
import { CancelSessionRequest, DashboardSnapshot } from '../entities/dashboard-snapshot';

/**
 * Mismo patrón que RefreshDashboard: NO se registra en Angular DI, se instancia
 * a mano en la facade.
 *
 * NO valida que el club esté activo: RefreshDashboard ya lo hace en la carga y
 * repetirlo acá sería una regla inventada.
 */
export class CancelSession {
  constructor(private readonly dashboards: DashboardRepository) {}

  execute(clubId: string, req: CancelSessionRequest): Promise<DashboardSnapshot> {
    return this.dashboards.cancelSession(clubId, req);
  }
}
