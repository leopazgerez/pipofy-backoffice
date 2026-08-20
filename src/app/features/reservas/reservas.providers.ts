import { Provider } from '@angular/core';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ReservationsRepository } from '@domain/contracts/reservations.repository';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { HttpClassSessionsRepository } from '@data/repositories/http-class-sessions.repository';
import { HttpReservationsRepository } from '@data/repositories/http-reservations.repository';
import { HttpStudentsRepository } from '@data/repositories/http-students.repository';
import { HttpPlansRepository } from '@data/repositories/http-plans.repository';
import { HttpCourtsRepository } from '@data/repositories/http-courts.repository';
import { HttpCoachesRepository } from '@data/repositories/http-coaches.repository';
import { HttpCategoryGroupsRepository } from '@data/repositories/http-category-groups.repository';

// Los cuatro últimos son sólo para ponerles NOMBRE a los ids que devuelve /class-sessions, que
// trae courtId/coachId/categoryGroupId pelados, y al planId de cada StudentPlan. Mismo
// argumento que alumnos.providers.ts: son contratos de DOMINIO, no de otra feature, y dos
// instancias de un repo sin estado no cuestan nada. StudentsRepository además aporta los
// planes del alumno para el select.
export const RESERVAS_PROVIDERS: Provider[] = [
  { provide: ClassSessionsRepository, useClass: HttpClassSessionsRepository },
  { provide: ReservationsRepository, useClass: HttpReservationsRepository },
  { provide: StudentsRepository, useClass: HttpStudentsRepository },
  { provide: PlansRepository, useClass: HttpPlansRepository },
  { provide: CourtsRepository, useClass: HttpCourtsRepository },
  { provide: CoachesRepository, useClass: HttpCoachesRepository },
  { provide: CategoryGroupsRepository, useClass: HttpCategoryGroupsRepository },
];
