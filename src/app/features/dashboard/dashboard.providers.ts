import { Provider } from '@angular/core';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { InMemoryDashboardRepository } from '@data/repositories/in-memory-dashboard.repository';

// Bindeado en la ruta lazy de la feature, así la impl queda scoped a la feature.
// useFactory (no useClass) porque InMemoryDashboardRepository no es @Injectable (ver su nota
// sobre NG2003). Para conectar el backend real: cambiar por
//   { provide: DashboardRepository, useClass: HttpDashboardRepository }
// (importando HttpDashboardRepository desde '@data/repositories/http-dashboard.repository').
// Ese swap es de una línea y no arrastra nada más: el contrato no le pide a la impl ninguna
// invariante que la HTTP no cumpla.
export const DASHBOARD_PROVIDERS: Provider[] = [
  { provide: DashboardRepository, useFactory: () => new InMemoryDashboardRepository() },
];
