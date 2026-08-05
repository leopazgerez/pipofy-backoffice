import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionStore } from '../auth/session-store';
import { TokenRefresher } from './token-refresher';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // /auth/* es público y no lleva Bearer. Además, sin este skip un 401 del propio
  // /auth/refresh dispararía otro refresh: loop infinito.
  // ponytail: naive por diseño — asume que TODO bajo /auth/ es público. Techo: el día que
  // se agregue un endpoint autenticado ahí (ej. /auth/change-password, ya nombrado como
  // próxima feature) va a salir sin Bearer, 401 para siempre y sin refresh porque el 401
  // handler de abajo también lo saltea. Upgrade: lista explícita de rutas públicas
  // (/auth/login, /auth/refresh, /auth/signup, /auth/verify-email, /auth/resend-verification,
  // /auth/logout) en vez de un prefijo.
  if (req.url.includes('/auth/')) return next(req);

  // inject() DEBE ser sincrónico acá arriba: dentro de catchError ya no hay contexto
  // de inyección y tira NG0203.
  const store = inject(SessionStore);
  const refresher = inject(TokenRefresher);

  const withAuth = (r: HttpRequest<unknown>) => {
    const token = store.accessToken();
    return token ? r.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : r;
  };

  return next(withAuth(req)).pipe(
    catchError((err) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401 || !store.refreshToken()) {
        return throwError(() => err);
      }
      return refresher.run().pipe(switchMap(() => next(withAuth(req))));
    }),
  );
};
