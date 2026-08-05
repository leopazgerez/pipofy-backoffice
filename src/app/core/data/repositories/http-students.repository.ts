import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { Student, StudentDraft } from '@domain/entities/student';
import { StudentListDtoSchema, StudentRequestSchema } from '../dto/students.dto';
import { toStudent, toStudentRequest } from '../mappers/student.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

/**
 * ApiClient ya normaliza los errores HTTP a DomainError, pero v.parse tira ValiError fuera
 * del observable: el try/catch está para que las dos vías salgan normalizadas.
 */
@Injectable()
export class HttpStudentsRepository extends StudentsRepository {
  private readonly api = inject(ApiClient);

  async list(): Promise<Student[]> {
    try {
      const raw = await firstValueFrom(this.api.get<unknown>('/students'));
      const dtos = v.parse(StudentListDtoSchema, raw);
      // ponytail: el filtro de borrados es del cliente porque students.service.list() no
      // excluye deletedAt. Techo: además el backend no pagina, así que la lista entera
      // viaja en cada carga. Con un club de cientos de alumnos empieza a pesar. Salida
      // real: paginar y filtrar en el backend.
      return dtos.filter((d) => d.deletedAt === null).map(toStudent);
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async create(draft: StudentDraft): Promise<void> {
    try {
      const body = v.parse(StudentRequestSchema, toStudentRequest(draft));
      await firstValueFrom(this.api.post<unknown>('/students', body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async update(id: string, draft: StudentDraft): Promise<void> {
    try {
      const body = v.parse(StudentRequestSchema, toStudentRequest(draft));
      await firstValueFrom(this.api.patch<unknown>(`/students/${id}`, body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete<unknown>(`/students/${id}`));
    } catch (err) {
      throw toDomainError(err);
    }
  }
}
