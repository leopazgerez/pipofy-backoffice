import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { CategoryGroup, CategoryGroupDraft } from '@domain/entities/category-group';
import { CategoryGroupListDtoSchema, CategoryGroupRequestSchema } from '../dto/category-groups.dto';
import { toCategoryGroup, toCategoryGroupRequest } from '../mappers/category-group.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

/**
 * ApiClient ya normaliza los errores HTTP a DomainError, pero v.parse tira ValiError fuera
 * del observable: el try/catch está para que las dos vías salgan normalizadas.
 */
@Injectable()
export class HttpCategoryGroupsRepository extends CategoryGroupsRepository {
  private readonly api = inject(ApiClient);

  async list(): Promise<CategoryGroup[]> {
    try {
      const raw = await firstValueFrom(this.api.get<unknown>('/category-groups'));
      const dtos = v.parse(CategoryGroupListDtoSchema, raw);
      // ponytail: el filtro de borrados es del cliente porque category-groups.service.list()
      // no excluye deletedAt. Techo: con muchos grupos borrados se transfieren filas de más.
      // Salida real: arreglarlo en el backend.
      return dtos.filter((d) => d.deletedAt === null).map(toCategoryGroup);
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async create(draft: CategoryGroupDraft): Promise<void> {
    try {
      const body = v.parse(CategoryGroupRequestSchema, toCategoryGroupRequest(draft));
      await firstValueFrom(this.api.post<unknown>('/category-groups', body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async update(id: string, draft: CategoryGroupDraft): Promise<void> {
    try {
      const body = v.parse(CategoryGroupRequestSchema, toCategoryGroupRequest(draft));
      await firstValueFrom(this.api.patch<unknown>(`/category-groups/${id}`, body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete<unknown>(`/category-groups/${id}`));
    } catch (err) {
      throw toDomainError(err);
    }
  }
}
