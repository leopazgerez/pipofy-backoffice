import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { ClubRepository } from '@domain/contracts/club.repository';
import { Club, ClubDraft } from '@domain/entities/club';
import { ClubDtoSchema, ClubRequestSchema } from '../dto/clubs.dto';
import { toClub, toClubRequest } from '../mappers/club.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

/**
 * ApiClient ya normaliza los errores HTTP a DomainError, pero v.parse tira ValiError fuera
 * del observable: el try/catch está para que las dos vías salgan normalizadas.
 */
@Injectable()
export class HttpClubRepository extends ClubRepository {
  private readonly api = inject(ApiClient);

  async get(): Promise<Club> {
    try {
      const raw = await firstValueFrom(this.api.get<unknown>('/clubs/me'));
      return toClub(v.parse(ClubDtoSchema, raw));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async update(draft: ClubDraft): Promise<void> {
    try {
      const body = v.parse(ClubRequestSchema, toClubRequest(draft));
      await firstValueFrom(this.api.patch<unknown>('/clubs/me', body));
    } catch (err) {
      throw toDomainError(err);
    }
  }

  /**
   * Falla ABIERTO: sólo devuelve false cuando el backend CONFIRMA que el club está borrado.
   * Si la request falla (403 de un rol sin permiso, 500 de un usuario sin clubId, red
   * caída) devuelve true, porque un club que no se pudo verificar no es un club inactivo
   * — y tratarlo como tal reemplaza el dashboard ENTERO por un error de permisos sobre una
   * pantalla que no tiene nada que ver (§8.5 punto 3).
   *
   * El `clubId` se IGNORA a propósito: el endpoint es /clubs/me y el club sale del token
   * (§3.9). No existe GET /clubs/:id. La firma se conserva porque la fija RefreshDashboard,
   * que es de otra feature.
   *
   * ponytail: cada llamada re-pide /clubs/me. Techo: RefreshDashboard la llama una vez por
   * refresco del dashboard. Si eso pesa, un cache como el de CatalogsFacade — no antes.
   */
  async isActive(_clubId: string): Promise<boolean> {
    try {
      return (await this.get()).active;
    } catch {
      return true;
    }
  }
}
