import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { SessionStore } from '../auth/session-store';
import { TokenRefresher } from './token-refresher';

/**
 * Las rutas de /auth/ que NO llevan Bearer. Lista explícita y no el prefijo `/auth/`, porque
 * `POST /auth/change-password` está detrás de JwtAuthGuard: con el prefijo salía sin token y
 * daba 401 para siempre.
 */
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/refresh',
  '/auth/logout',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/password-reset/request',
  '/auth/password-reset/confirm',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isAuthRoute = req.url.includes('/auth/');
  if (PUBLIC_AUTH_PATHS.some((path) => req.url.includes(path))) return next(req);

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
      // isAuthRoute corta dos casos: un 401 de /auth/refresh dispararía otro refresh (loop
      // infinito), y un 401 de /auth/change-password significa "clave actual incorrecta" —
      // refrescar y reintentar manda la misma clave equivocada y rota el token de gusto.
      if (
        isAuthRoute ||
        !(err instanceof HttpErrorResponse) ||
        err.status !== 401 ||
        !store.refreshToken()
      ) {
        return throwError(() => err);
      }
      return refresher.run().pipe(switchMap(() => next(withAuth(req))));
    }),
  );
};
