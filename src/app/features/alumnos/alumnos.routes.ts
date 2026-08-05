import { Routes } from '@angular/router';
import { ALUMNOS_PROVIDERS } from './alumnos.providers';
import { AlumnosFacade } from './alumnos.facade';

/**
 * Una sola pantalla, así que la facade va acá y no en una ruta padre: no hay tabs entre las
 * que sobrevivir, a diferencia de configuracion.routes.ts. Cuando llegue el detalle del
 * alumno (créditos, planes), esto pasa a tener children y la facade se queda donde está.
 */
export const ALUMNOS_ROUTES: Routes = [
  {
    path: '',
    providers: [AlumnosFacade, ...ALUMNOS_PROVIDERS],
    loadComponent: () =>
      import('./pages/alumnos-page.component').then((m) => m.AlumnosPageComponent),
  },
];
