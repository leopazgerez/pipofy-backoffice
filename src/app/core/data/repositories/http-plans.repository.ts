import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { Plan, PlanDraft } from '@domain/entities/plan';
import { PlanListDtoSchema, PlanRequestSchema } from '../dto/plans.dto';
import { toPlan, toPlanRequest } from '../mappers/plan.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

/**
 * ApiClient ya normaliza los errores HTTP a DomainError, pero v.parse tira ValiError fuera
 * del observable: el try/catch está para que las dos vías salgan normalizadas.
 */
@Injectable()
export class HttpPlansRepository extends PlansRepository {
  private readonly api = inject(ApiClient);

  async list(): Promise<Plan[]> {
    try {
      const raw = await firstValueFrom(this.api.get<unknown>('/plans'));
      const dtos = v.parse(PlanListDtoSchema, raw);
      // ponytail: el filtro de borrados es del cliente porque plans.service.list() no
      // excluye deletedAt. Techo: con muchos planes borrados se transfieren filas de más.
      // Salida real: arreglarlo en el backend.
      return dtos.filter((d) => d.deletedAt === null).map(toPlan);
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async create(draft: PlanDraft): Promise<void> {
    try {
      const body = v.parse(PlanRequestSchema, toPlanRequest(draft));
      await firstValueFrom(this.api.post<unknown>('/plans', body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async update(id: string, draft: PlanDraft): Promise<void> {
    try {
      const body = v.parse(PlanRequestSchema, toPlanRequest(draft));
      await firstValueFrom(this.api.patch<unknown>(`/plans/${id}`, body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete<unknown>(`/plans/${id}`));
    } catch (err) {
      throw toDomainError(err);
    }
  }
}
