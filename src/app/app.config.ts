import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { tenantInterceptor } from './shared/http/tenant.interceptor';
import { errorLogInterceptor } from './shared/http/error-log.interceptor';
import { authInterceptor } from './core/data/http/auth.interceptor';
import { TokenRefresher } from './core/data/http/token-refresher';
import { SessionStore } from './core/data/auth/session-store';
import { SessionFacade } from '@features/auth/session.facade';
import { ClubRepository } from '@domain/contracts/club.repository';
import { AuthRepository } from '@domain/contracts/auth.repository';
import { HttpAuthRepository } from '@data/repositories/http-auth.repository';
import { HttpClubRepository } from '@data/repositories/http-club.repository';
import { environment } from '../environments/environment';
import { API_CONFIG } from './core/data/config/api-config.token';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, tenantInterceptor, errorLogInterceptor])),
    // Auth va en ROOT y no en la ruta lazy de la feature (rompiendo la convención del resto
    // del proyecto a propósito): el interceptor puede necesitar refrescar en CUALQUIER
    // request y el guard corre antes de que exista ninguna ruta lazy.
    SessionStore,
    SessionFacade,
    TokenRefresher,
    { provide: AuthRepository, useClass: HttpAuthRepository },
    // En ROOT y no en una ruta lazy, igual que AuthRepository: lo necesitan DOS rutas lazy
    // distintas — el dashboard (vía RefreshDashboard) y Configuración → Club. Es el mismo
    // patrón que Auth, no el mismo motivo: Auth está acá porque el interceptor corre antes
    // de que exista ninguna ruta.
    //
    // Resuelve desde root porque ApiClient es providedIn:'root' (api-client.ts:7).
    { provide: ClubRepository, useClass: HttpClubRepository },
    {
      provide: API_CONFIG,
      useValue: {
        apiBaseUrl: environment.apiBaseUrl,
        realtimeBaseUrl: environment.realtimeBaseUrl,
      },
    },
  ]
};
