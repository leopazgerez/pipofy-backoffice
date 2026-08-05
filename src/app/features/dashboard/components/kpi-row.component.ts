import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Kpis } from '@domain/entities/dashboard-snapshot';
import { formatArs } from '../dashboard-format';

@Component({
  selector: 'app-kpi-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './kpi-row.component.css',
  template: `
    <div class="kpis">
      <div class="kpi">
        <div class="k-lbl"><span class="k-ico" style="background:var(--color-primary)"></span>Sesiones hoy</div>
        <div class="k-val">{{ kpis().sessionsToday }} <small>/ {{ kpis().courtsTotal }} canchas</small></div>
      </div>
      <div class="kpi">
        <div class="k-lbl"><span class="k-ico" style="background:var(--color-accent-strong)"></span>Ocupación</div>
        <div class="k-val">{{ kpis().occupancyPct }}<small>%</small></div>
      </div>
      <div class="kpi">
        <div class="k-lbl"><span class="k-ico" style="background:var(--color-warning)"></span>Holds activos</div>
        <div class="k-val">{{ activeHolds() }}</div>
      </div>
      <div class="kpi">
        <div class="k-lbl"><span class="k-ico" style="background:var(--color-secondary)"></span>Ingresos hoy</div>
        <div class="k-val" style="font-family:var(--font-mono);font-size:20px">{{ money(kpis().revenueTodayCents) }}</div>
      </div>
    </div>
  `,
})
export class KpiRowComponent {
  readonly kpis = input.required<Kpis>();
  readonly activeHolds = input.required<number>();
  protected readonly money = formatArs;
}
