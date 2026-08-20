import { Provider } from '@angular/core';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { HttpDashboardRepository } from '@data/repositories/http-dashboard.repository';
import { HttpCourtsRepository } from '@data/repositories/http-courts.repository';
import { HttpCoachesRepository } from '@data/repositories/http-coaches.repository';
import { HttpCategoryGroupsRepository } from '@data/repositories/http-category-groups.repository';
import { HttpClassSessionsRepository } from '@data/repositories/http-class-sessions.repository';

// El dashboard no tiene endpoint propio: HttpDashboardRepository compone el snapshot desde
// ClassSessionsRepository, estos tres repositorios y el catálogo de superficies. Por eso la
// ruta lazy tiene que proveerlos, no sólo DashboardRepository.
//
// `CatalogsRepository` NO está acá: vive en root (app.config.ts) porque Configuración también
// lo usa, y una instancia por ruta lazy significaba un cache de catálogos por ruta.
export const DASHBOARD_PROVIDERS: Provider[] = [
  { provide: DashboardRepository, useClass: HttpDashboardRepository },
  { provide: CourtsRepository, useClass: HttpCourtsRepository },
  { provide: CoachesRepository, useClass: HttpCoachesRepository },
  { provide: CategoryGroupsRepository, useClass: HttpCategoryGroupsRepository },
  { provide: ClassSessionsRepository, useClass: HttpClassSessionsRepository },
];
