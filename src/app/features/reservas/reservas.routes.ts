import { Routes } from '@angular/router';
import { RESERVAS_PROVIDERS } from './reservas.providers';
import { ReservasFacade } from './reservas.facade';
import { SesionFacade } from './sesion.facade';

/**
 * Las dos facades van en la ruta: SesionFacade inyecta a ReservasFacade, y sus holds
 * pendientes tienen que sobrevivir a cerrar y reabrir el modal.
 */
export const RESERVAS_ROUTES: Routes = [
  {
    path: '',
    providers: [ReservasFacade, SesionFacade, ...RESERVAS_PROVIDERS],
    loadComponent: () =>
      import('./pages/reservas-page.component').then((m) => m.ReservasPageComponent),
  },
];
