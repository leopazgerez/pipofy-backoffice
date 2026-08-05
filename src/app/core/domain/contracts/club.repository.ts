import { Club, ClubDraft } from '../entities/club';

/**
 * abstract class = token DI + tipo + contrato, en TS puro (sin @angular/* en domain).
 *
 * A diferencia del resto del proyecto, su binding va en ROOT (app.config.ts) y no en una
 * ruta lazy: lo necesitan dos rutas distintas — el dashboard, vía RefreshDashboard, y la
 * pantalla de Configuración → Club.
 */
export abstract class ClubRepository {
  /**
   * El clubId sale del token: el endpoint es /clubs/me y NO existe GET /clubs/:id (§3.9).
   */
  abstract get(): Promise<Club>;
  abstract update(draft: ClubDraft): Promise<void>;
  /**
   * Se conserva con esta firma porque la fija RefreshDashboard, de otra feature. La impl
   * ignora el argumento y falla ABIERTO — ver HttpClubRepository.
   */
  abstract isActive(clubId: string): Promise<boolean>;
}
