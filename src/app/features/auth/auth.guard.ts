import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '@data/auth/session-store';

/**
 * Vive en features/auth pero se aplica desde app.routes.ts, que está fuera de los elements
 * de boundaries: no constituye una dependencia de una feature hacia otra.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  return store.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
