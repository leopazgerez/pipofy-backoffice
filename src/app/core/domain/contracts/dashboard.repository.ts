import { DashboardSnapshot } from '../entities/dashboard-snapshot';

// abstract class = token DI + tipo + contrato, en TS puro.
export abstract class DashboardRepository {
  /**
   * `clubId` NO viaja a la API: todos los endpoints lo resuelven del JWT. Se recibe para
   * poblar `snapshot.clubId` y porque lo fija RefreshDashboard, que valida el club antes de
   * pedir el snapshot. Misma divergencia que documenta CourtsRepository.
   */
  abstract getSnapshot(clubId: string): Promise<DashboardSnapshot>;
}
