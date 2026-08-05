import { Routes } from '@angular/router';
import { GruposFacade } from './grupos.facade';
import { GRUPOS_PROVIDERS } from './grupos.providers';

/**
 * La facade se provee en la ruta PADRE, así las dos páginas comparten instancia: entrar por
 * deep-link a /grupos/3 carga el snapshot, y volver a la lista NO recarga (cada página llama
 * load() sólo si data() está vacío).
 */
export const GRUPOS_ROUTES: Routes = [
  {
    path: '',
    providers: [GruposFacade, ...GRUPOS_PROVIDERS],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/grupos-list-page.component').then((m) => m.GruposListPageComponent),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/grupo-detail-page.component').then((m) => m.GrupoDetailPageComponent),
      },
    ],
  },
];
