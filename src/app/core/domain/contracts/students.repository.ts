import { Student, StudentDraft } from '../entities/student';
import { StudentPlan } from '../entities/student-plan';

/** Ver CategoryGroupsRepository por qué es una clase abstracta y por qué no lleva clubId. */
export abstract class StudentsRepository {
  abstract list(): Promise<Student[]>;
  abstract create(draft: StudentDraft): Promise<void>;
  abstract update(id: string, draft: StudentDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;

  /**
   * Los planes comprados por UN alumno. Vive acá y no en un StudentPlansRepository propio
   * porque el endpoint es `/students/:id/plans` y un contrato nuevo sólo agregaría un
   * binding más a alumnos.providers.ts.
   *
   * Sólo lectura: `POST /students/:id/plans` existe en la API pero pide un `paymentMethodId`
   * y no hay endpoint que liste los métodos de pago, así que la compra no se puede armar
   * desde el front todavía.
   */
  abstract plans(studentId: string): Promise<StudentPlan[]>;
}
