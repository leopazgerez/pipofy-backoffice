import { Routes } from '@angular/router';
import { DashboardFacade } from './dashboard.facade';
import { DASHBOARD_PROVIDERS } from './dashboard.providers';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    providers: [DashboardFacade, ...DASHBOARD_PROVIDERS],
    loadComponent: () =>
      import('./pages/dashboard-page.component').then((m) => m.DashboardPageComponent),
  },
];
