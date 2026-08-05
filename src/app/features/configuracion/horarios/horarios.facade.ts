import { Injectable, WritableSignal, computed, inject, signal } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { SchedulesRepository } from '@domain/contracts/schedules.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import {
  Schedule,
  ScheduleInput,
  createScheduleDraft,
  SessionGenerationInput,
  SessionGenerationResult,
  createSessionGenerationDraft,
} from '@domain/entities/schedule';
import { Court } from '@domain/entities/court';
import { Coach } from '@domain/entities/coach';
import { CategoryGroup } from '@domain/entities/category-group';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';
import { CatalogItem } from '@data/dto/catalogs.dto';
import { CatalogsFacade } from '../catalogs.facade';

/**
 * ponytail: create/update/remove reusan `loading`, así que la tabla muestra su spinner
 * mientras se guarda. Es aceptable porque el modal la tapa.
 */
@Injectable()
export class HorariosFacade extends SignalStore<Schedule[], DomainError> {
  private readonly repo = inject(SchedulesRepository);
  private readonly courtsRepo = inject(CourtsRepository);
  private readonly coachesRepo = inject(CoachesRepository);
  private readonly categoryGroupsRepo = inject(CategoryGroupsRepository);
  private readonly catalogs = inject(CatalogsFacade);

  private readonly _courts = signal<readonly Court[]>([]);
  private readonly _coaches = signal<readonly Coach[]>([]);
  private readonly _categoryGroups = signal<readonly CategoryGroup[]>([]);
  private readonly _sessionTypes = signal<readonly CatalogItem[]>([]);
  /** Lookup para el select de canchas y para la columna Cancha. Vacío si su carga falló. */
  readonly courts = this._courts.asReadonly();
  /** Lookup para el select de profesores y para la columna Profesor. Vacío si su carga falló. */
  readonly coaches = this._coaches.asReadonly();
  /** Lookup para el select de grupos y para la columna Grupo. Vacío si su carga falló. */
  readonly categoryGroups = this._categoryGroups.asReadonly();
  /** Lookup para el select de tipo de clase. Vacío si falló. */
  readonly sessionTypes = this._sessionTypes.asReadonly();

  private readonly _generating = signal(false);
  private readonly _generateError = signal<DomainError | null>(null);
  readonly generating = this._generating.asReadonly();
  readonly generateError = this._generateError.asReadonly();

  /**
   * El backend no ordena. Y el orden NO es el numérico de `weekday`: 0 es domingo (§3.4) y
   * en Argentina la semana arranca el lunes, así que (weekday + 6) % 7 lo manda al final.
   * Las filas sin día van después de todo: son plantillas viejas que generateSessions saltea.
   */
  readonly sorted = computed(() => {
    const rows = this.data() ?? [];
    return [...rows].sort((a, b) => {
      const wa = a.weekday === null ? 99 : (a.weekday + 6) % 7;
      const wb = b.weekday === null ? 99 : (b.weekday + 6) % 7;
      if (wa !== wb) return wa - wb;
      return (a.startTime ?? '').localeCompare(b.startTime ?? '');
    });
  });

  load(): Promise<void> {
    return this.run(this.repo.list(), toDomainError);
  }

  /**
   * Los lookups fallan en SILENCIO, misma política que en Canchas y Planes: sin canchas el
   * select queda vacío, pero la tabla sigue siendo usable y el error que importa —el de la
   * lista de horarios— es el que se muestra. Meterlos en error() taparía el otro.
   *
   * No usa run() justamente por eso: run() escribe en data(), loading() y error().
   *
   * El helper existe porque acá hay CUATRO copias del mismo try/catch. Con una o dos, el
   * try/catch a la vista es más claro que la indirección — por eso las otras facades no lo
   * tienen y no hay que "unificarlas".
   */
  private async loadLookup<T>(
    fetch: () => Promise<readonly T[]>,
    target: WritableSignal<readonly T[]>,
  ): Promise<void> {
    try {
      target.set(await fetch());
    } catch {
      target.set([]);
    }
  }

  /** La página lo llama junto con load(): las cuatro cargas van en paralelo, cada una con
   *  su propio try/catch silencioso vía loadLookup. */
  async loadLookups(): Promise<void> {
    await Promise.all([
      this.loadLookup(() => this.courtsRepo.list(), this._courts),
      this.loadLookup(() => this.coachesRepo.list(), this._coaches),
      this.loadLookup(() => this.categoryGroupsRepo.list(), this._categoryGroups),
      this.loadLookup(() => this.catalogs.sessionTypes(), this._sessionTypes),
    ]);
  }

  /** Ver GruposCategoriaFacade.clearError(): mismo motivo, y por qué no vive en SignalStore. */
  clearError(): void {
    this.setError(null);
  }

  /**
   * SignalStore.reset() sólo limpia data/loading/error: no sabe de los cuatro lookups ni de
   * generating/generateError, seis piezas de estado propias de esta facade. Mismo override
   * que PlanesFacade (planes.facade.ts:60).
   */
  override reset(): void {
    super.reset();
    this._courts.set([]);
    this._coaches.set([]);
    this._categoryGroups.set([]);
    this._sessionTypes.set([]);
    this._generating.set(false);
    this._generateError.set(null);
  }

  /**
   * createScheduleDraft tira de forma síncrona ante cualquier invariante (FK vacío, día sin
   * elegir, horas inválidas); va DENTRO de la promesa para que run()/toDomainError
   * normalicen tanto la invariante de dominio como el fallo del repo. Mismo patrón que
   * CanchasFacade.create().
   */
  create(input: ScheduleInput): Promise<void> {
    return this.run(
      Promise.resolve()
        .then(() => this.repo.create(createScheduleDraft(input)))
        .then(() => this.repo.list()),
      toDomainError,
    );
  }

  update(id: string, input: ScheduleInput): Promise<void> {
    return this.run(
      Promise.resolve()
        .then(() => this.repo.update(id, createScheduleDraft(input)))
        .then(() => this.repo.list()),
      toDomainError,
    );
  }

  remove(id: string): Promise<void> {
    return this.run(
      this.repo.remove(id).then(() => this.repo.list()),
      toDomainError,
    );
  }

  /** Se llama al ABRIR el modal: regla 4 de §8.0, un error viejo no puede aparecer en una
   *  apertura nueva. */
  clearGenerateError(): void { this._generateError.set(null); }

  /**
   * Estado propio y no el triple: un fallo al generar no puede borrar ni tapar la lista de
   * horarios, que es lo que haría run() al escribir data() y error().
   *
   * createSessionGenerationDraft tira de forma SÍNCRONA (rango invertido, más de 60 días,
   * fecha inválida). A diferencia de create()/update()/remove() —que delegan a run(), cuyo
   * try/catch vive en OTRO método, y por eso necesitan Promise.resolve().then() para que el
   * throw síncrono llegue convertido en rechazo— acá el try/catch está en la MISMA función
   * que construye el draft, así que una llamada directa ya cae en el catch de abajo sin
   * indirección: no hace falta, y agregarla retrasa un microtask la llamada real al repo,
   * lo que rompe el spec "generating() está en true mientras la request está en vuelo" (el
   * mock reasigna su resolve() de forma síncrona; con la indirección, ese resolve() todavía
   * no existe cuando el test lo invoca, y la promesa queda colgada para siempre). §8.4 lo
   * mostraba con Promise.resolve().then() por copiar el molde de run(); acá no aplica.
   */
  async generate(input: SessionGenerationInput): Promise<SessionGenerationResult | null> {
    this._generating.set(true);
    this._generateError.set(null);
    try {
      const result = await this.repo.generateSessions(createSessionGenerationDraft(input));
      return result;
    } catch (e) {
      this._generateError.set(toDomainError(e));
      return null;
    } finally {
      this._generating.set(false);
    }
  }
}
