import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardFacade } from '../dashboard.facade';
import { KpiRowComponent } from '../components/kpi-row.component';
import { CourtGridComponent } from '../components/court-grid.component';
import { WaitlistCardComponent } from '../components/waitlist-card.component';

const CLUB_ID = 'c1';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [KpiRowComponent, CourtGridComponent, WaitlistCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  protected readonly facade = inject(DashboardFacade);

  constructor() {
    void this.facade.load(CLUB_ID);
  }
}
