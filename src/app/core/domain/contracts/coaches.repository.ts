import { Coach, CoachDraft } from '../entities/coach';

/**
 * El slice B agrega update(): sólo `description`, que es lo único que el backend escribe
 * (§3.10). No se pre-construye lo que todavía no tiene consumidor.
 */
export abstract class CoachesRepository {
  abstract list(): Promise<Coach[]>;
  /** Sólo `description`: es lo único que el backend escribe (§3.10). */
  abstract update(id: string, draft: CoachDraft): Promise<void>;
}
