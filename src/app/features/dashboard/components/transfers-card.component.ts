import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PendingTransfer } from '@domain/entities/dashboard-snapshot';
import { formatArs } from '../dashboard-format';

@Component({
  selector: 'app-transfers-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="acard">
      <div class="a-head">
        <span class="ic pay" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18" stroke="currentColor" stroke-width="1.8"/></svg>
        </span>
        <h3>Transferencias pendientes</h3>
        <span class="cnt pay">{{ transfers().length }}</span>
      </div>
      <div class="a-body">
        @for (t of transfers(); track t.id) {
          <div class="arow">
            <div class="a-main"><div class="a-title">{{ t.name }}</div><div class="a-meta">{{ money(t.amountCents) }} · {{ t.plan }}</div></div>
          </div>
        } @empty {
          <div class="a-empty">Todo conciliado</div>
        }
      </div>
    </div>
  `,
})
export class TransfersCardComponent {
  readonly transfers = input.required<PendingTransfer[]>();
  protected readonly money = formatArs;
}
