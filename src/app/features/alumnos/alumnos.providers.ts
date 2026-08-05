import { Provider } from '@angular/core';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { CategoriesRepository } from '@domain/contracts/categories.repository';
import { HttpStudentsRepository } from '@data/repositories/http-students.repository';
import { HttpCategoriesRepository } from '@data/repositories/http-categories.repository';

export const ALUMNOS_PROVIDERS: Provider[] = [
  { provide: StudentsRepository, useClass: HttpStudentsRepository },
  // Para el select y la columna de categoría. `CategoriesRepository` es un contrato de
  // DOMINIO, no de la feature configuracion: importarlo acá no viola el límite de
  // eslint-plugin-boundaries.
  //
  // Convive con el binding de configuracion.providers.ts: cada ruta lazy instancia el suyo
  // y los repositorios no tienen estado, así que dos instancias no cuestan nada.
  { provide: CategoriesRepository, useClass: HttpCategoriesRepository },
];
