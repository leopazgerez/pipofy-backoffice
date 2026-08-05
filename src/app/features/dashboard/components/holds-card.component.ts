import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Hold } from '@domain/entities/dashboard-snapshot';
import { formatCountdown } from '../dashboard-format';

@Component({
  selector: 'app-holds-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="acard">
      <div class="a-head">
        <span class="ic hold" aria-hidden="true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v4.5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
        <h3>Holds por vencer</h3>
        <span class="cnt hold">{{ holds().length }}</span>
      </div>
      <div class="a-body">
        @for (h of holds(); track h.id) {
          <div class="arow">
            <div class="a-main"><div class="a-title">{{ h.name }}</div><div class="a-meta">{{ h.session }}</div></div>
            <span class="count {{ h.expiresInSeconds < 120 ? 'crit' : 'warn' }}">{{ time(h.expiresInSeconds) }}</span>
          </div>
        } @empty {
          <div class="a-empty">Sin holds por vencer</div>
        }
      </div>
    </div>
  `,
})
export class HoldsCardComponent {
  readonly holds = input.required<Hold[]>();
  protected readonly time = formatCountdown;
}
