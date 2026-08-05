import { CancelSessionRequest, DashboardSnapshot } from '../entities/dashboard-snapshot';

// abstract class = token DI + tipo + contrato, en TS puro.
export abstract class DashboardRepository {
  abstract getSnapshot(clubId: string): Promise<DashboardSnapshot>;

  /**
   * Cancela una sesión y devuelve el snapshot YA actualizado (una sola ida y
   * vuelta, sin refetch). Tira SessionNotFoundError si courtName+hour no matchea
   * una sesión existente.
   *
   * Al ser abstract, agregar este método fuerza EN COMPILE-TIME que todas las
   * implementaciones lo tengan. Ese es el guardrail: el compilador es la
   * checklist, no una persona.
   *
   * El snapshot devuelto puede ser tan nuevo como quiera la implementación: la
   * página siembra su countdown de holds desde el load(), no desde este snapshot,
   * así que no hay ninguna invariante de identidad de referencias que respetar.
   */
  abstract cancelSession(clubId: string, req: CancelSessionRequest): Promise<DashboardSnapshot>;
}
