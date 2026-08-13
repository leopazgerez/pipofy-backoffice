import { Injectable, computed, inject, signal } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { StudentPlan, studentPlanIsExpired, usableCredits } from '@domain/entities/student-plan';
import { Plan } from '@domain/entities/plan';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';
import { localDateKey } from '@domain/local-date';

/**
 * Los planes de UN alumno, los del modal. Separada de AlumnosFacade a propósito: SignalStore
 * tiene un solo triad data/loading/error, y meter esto adentro haría que el spinner de la
 * tabla se encienda al abrir el modal, y que un error del modal tape el de la tabla.
 */
@Injectable()
export class AlumnoPlanesFacade extends SignalStore<StudentPlan[], DomainError> {
  private readonly repo = inject(StudentsRepository);
  private readonly plansRepo = inject(PlansRepository);

  /** Congelado en cada load(): un computed que llamara new Date() no sería determinista. */
  private readonly _today = signal(localDateKey(new Date()));
  private readonly _plans = signal<readonly Plan[]>([]);

  /** Créditos que el alumno puede usar HOY. Los de planes vencidos NO cuentan. */
  readonly credits = computed(() => usableCredits(this.data() ?? [], this._today()));

  /** planId → nombre. Se rearma sólo cuando cambia el catálogo, no por cada fila y ciclo. */
  private readonly _names = computed(
    () => new Map(this._plans().map((p) => [p.id, p.name] as const)),
  );

  async load(studentId: string): Promise<void> {
    this._today.set(localDateKey(new Date()));
    // Los dos pedidos salen juntos: el catálogo de planes sólo sirve para poner nombres y no
    // debe agregarle su latencia a la tabla.
    void this.loadPlanNames();
    await this.run(this.repo.plans(studentId), toDomainError);
  }

  /**
   * `GET /students/:id/plans` devuelve planId, no el nombre. Falla en SILENCIO, misma
   * política que AlumnosFacade.loadCategories(): sin nombres la tabla sigue mostrando
   * créditos y vencimientos, que es lo que se vino a ver.
   *
   * Se pide UNA vez por instancia: la facade es scoped a la ruta de alumnos, así que abrir el
   * modal para diez alumnos seguidos pedía diez veces la misma lista, que no cambia mientras
   * dure la pantalla.
   */
  private async loadPlanNames(): Promise<void> {
    if (this._plans().length > 0) return;
    try {
      this._plans.set(await this.plansRepo.list());
    } catch {
      this._plans.set([]);
    }
  }

  planName(planId: string): string {
    return this._names().get(planId) || `Plan #${planId}`;
  }

  /** Delegado al dominio: la copia local de esta regla no miraba los créditos y lo contradecía. */
  isExpired(plan: StudentPlan): boolean {
    return studentPlanIsExpired(plan, this._today());
  }
}
