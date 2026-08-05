import { Court, CourtDraft } from '../entities/court';

/**
 * Clase abstracta a propósito: hace de token DI sin arrastrar @angular/core al dominio.
 *
 * Sin `clubId`: el backend lo resuelve del JWT (§4.9). Es una divergencia deliberada
 * respecto de DashboardRepository y GroupsRepository, que sí lo reciben.
 *
 * Las escrituras devuelven void y la facade re-lee: parchear la lista en memoria ahorra
 * una llamada trivial y agrega una vía de desincronización (§5.2).
 */
export abstract class CourtsRepository {
  abstract list(): Promise<Court[]>;
  abstract create(draft: CourtDraft): Promise<void>;
  abstract update(id: string, draft: CourtDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
