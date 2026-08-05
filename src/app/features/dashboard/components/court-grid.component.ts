import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CourtGrid, CourtSession, SessionState } from '@domain/entities/dashboard-snapshot';

const STATE_LABEL: Record<SessionState, string> = { full: 'completa', open: 'con cupo libre', wait: 'con lista de espera' };

@Component({
  selector: 'app-court-grid',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './court-grid.component.css',
  template: `
    <div class="grid-wrap">
      <div class="grid-scroll">
        <div class="court-grid">
          <div class="ch corner"></div>
          @for (c of grid().courts; track c.name) {
            <div class="ch">
              <div class="cn"><span class="surf {{ c.surface }}" aria-hidden="true"></span>{{ c.name }}</div>
              <div class="cmeta">{{ c.meta }}</div>
            </div>
          }
          @for (hr of grid().hours; track hr; let hi = $index) {
            <div class="hourcell">{{ hr }}</div>
            @for (c of grid().courts; track c.name; let ci = $index) {
              @let s = grid().sessions[hi][ci];
              @if (s) {
                <div class="slot">
                  <button type="button" class="sess {{ s.state }}" [attr.aria-label]="label(s, c.name, hr)"
                          (click)="sessionSelected.emit({ session: s, courtName: c.name, hour: hr })">
                    <div class="s-top">
                      <span class="s-cat">{{ s.category }}</span>
                      <span class="s-occ">{{ s.occupied }}/{{ s.capacity }}</span>
                    </div>
                    <div class="s-prof"><span class="pdot" aria-hidden="true">{{ s.initials }}</span>{{ s.professor }}</div>
                    @if (s.state === 'open') { <span class="s-flag wa">Cupo libre</span> }
                    @if (s.state === 'wait') { <span class="s-flag wait">En espera</span> }
                    <div class="occ-bar" aria-hidden="true"><i [style.width.%]="pct(s)"></i></div>
                  </button>
                </div>
              } @else {
                <div class="slot empty"></div>
              }
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class CourtGridComponent {
  readonly grid = input.required<CourtGrid>();

  /**
   * La sesión es la única celda accionable de la grilla (una sola acción: cancelar).
   * El resto del dashboard sigue read-only. Ver el spec §10.
   */
  readonly sessionSelected = output<{ session: CourtSession; courtName: string; hour: string }>();

  protected pct(s: CourtSession): number {
    return Math.round((s.occupied / s.capacity) * 100);
  }

  protected label(s: CourtSession, court: string, hour: string): string {
    return `${s.category}, ${court}, ${hour}, ${s.professor}, ${s.occupied} de ${s.capacity} lugares, ${STATE_LABEL[s.state]}.`;
  }
}
