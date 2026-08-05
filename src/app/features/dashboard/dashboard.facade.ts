import { Injectable, effect, inject } from '@angular/core';
import { SignalStore } from '@shared/signal-store/signal-store.base';
import { CancelSessionRequest, DashboardSnapshot } from '@domain/entities/dashboard-snapshot';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { ClubRepository } from '@domain/contracts/club.repository';
import { RefreshDashboard } from '@domain/use-cases/refresh-dashboard.use-case';
import { CancelSession } from '@domain/use-cases/cancel-session.use-case';
import { TenantContext } from '@shared/tenant/tenant-context';
import { DomainError } from '@domain/errors';
import { toDomainError } from '@data/http/to-domain-error';

@Injectable()
export class DashboardFacade extends SignalStore<DashboardSnapshot, DomainError> {
  private readonly dashboards = inject(DashboardRepository);
  private readonly refresh = new RefreshDashboard(this.dashboards, inject(ClubRepository));
  private readonly cancelUC = new CancelSession(this.dashboards);
  private readonly tenant = inject(TenantContext, { optional: true });

  constructor() {
    super();
    // Aislamiento de tenant: limpia el estado cuando el tenant CAMBIA (salta el valor inicial,
    // si no el primer run del effect pisaría el estado recién cargado).
    let seenFirst = false;
    effect(() => {
      this.tenant?.tenantId();
      if (!seenFirst) { seenFirst = true; return; }
      this.reset();
    });
  }

  // El use case gana su lugar (compone + valida), así que lo llamamos — no al repo directo.
  // toDomainError normaliza cualquier error lanzado (incl. ClubInactiveError) a DomainError.
  load(clubId: string): Promise<void> {
    return this.run(this.refresh.execute(clubId), toDomainError);
  }

  /**
   * LAS DOS TRAMPAS GEMELAS — este método NO toca `loading()` NI `error()`, a propósito.
   *
   * El template es una cadena `@if (loading()) … @else if (error()) … @else if (data())`
   * (dashboard-page.component.html:1-5):
   *   · usar run() prendería loading() → la página entera parpadea a "Cargando panel…"
   *     con el modal abierto encima;
   *   · usar setError() (el patrón estándar del repo: toDomainError + setError) tiene el
   *     MISMO efecto por la otra rama → reemplaza el dashboard por "No se pudo cargar el
   *     panel" aunque data() siga poblado.
   *
   * El error se propaga crudo al modal, que lo muestra como paso fallido + toast. Un
   * implementador que "arregle" esto usando run() reintroduce exactamente el bug.
   *
   * Deuda (spec §9.10): si un load() o el reset() por cambio de tenant resuelve mientras
   * este cancel() está en vuelo, gana el último. Hoy es inalcanzable (no hay selector de
   * tenant y nada más dispara load() después del arranque).
   */
  async cancel(clubId: string, req: CancelSessionRequest): Promise<void> {
    this.setData(await this.cancelUC.execute(clubId, req));
  }
}
