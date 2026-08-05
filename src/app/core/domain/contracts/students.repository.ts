import { Student, StudentDraft } from '../entities/student';

/** Ver CategoryGroupsRepository por qué es una clase abstracta y por qué no lleva clubId. */
export abstract class StudentsRepository {
  abstract list(): Promise<Student[]>;
  abstract create(draft: StudentDraft): Promise<void>;
  abstract update(id: string, draft: StudentDraft): Promise<void>;
  abstract remove(id: string): Promise<void>;
}
