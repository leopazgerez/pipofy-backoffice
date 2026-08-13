import { Injectable, computed, inject, signal } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { StudentPlan, usableCredits } from '@domain/entities/student-plan';
import { Plan } from '@domain/entities/plan';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';
import { localDateKey } from '@data/mappers/dashboard.mapper';

/**
 * Los planes de UN alumno, los del modal. Separada de AlumnosFacade a propósito: SignalStore
 * tiene un solo triad data/loading/error, y meter esto adentro haría que el spinner de la
 * tabla se encienda al abrir el modal, y que un error del modal tape el de la tabla.
 *
 * ponytail: `localDateKey` se importa del mapper del dashboard. Vive ahí porque el dashboard
 * fue su primer consumidor, no porque sea suyo — pero es la ÚNICA definición de "hoy en hora
 * local" y ya divergió una vez por estar escrita dos veces. Si aparece un tercer consumidor,
 * mudarla a shared/.
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
   */
  private async loadPlanNames(): Promise<void> {
    try {
      this._plans.set(await this.plansRepo.list());
    } catch {
      this._plans.set([]);
    }
  }

  planName(planId: string): string {
    const hit = this._plans().find((p) => p.id === planId);
    if (!hit) return `Plan #${planId}`;
    return hit.name || `Plan #${planId}`;
  }

  isUsable(plan: StudentPlan): boolean {
    return plan.expiresAt === null || plan.expiresAt >= this._today();
  }
}
