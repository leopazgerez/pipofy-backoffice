import { Provider } from '@angular/core';
import { GroupsRepository } from '@domain/contracts/groups.repository';
import { InMemoryGroupsRepository } from '@data/repositories/in-memory-groups.repository';

// Bindeado en la ruta lazy de la feature, así la impl queda scoped a la feature.
// useFactory (no useClass) porque InMemoryGroupsRepository no es @Injectable (ver su nota sobre
// NG2003). Para conectar el backend real: crear HttpGroupsRepository siguiendo el patrón de
// http-dashboard.repository.ts y cambiar esta línea por
//   { provide: GroupsRepository, useClass: HttpGroupsRepository }
export const GRUPOS_PROVIDERS: Provider[] = [
  { provide: GroupsRepository, useFactory: () => new InMemoryGroupsRepository() },
];
