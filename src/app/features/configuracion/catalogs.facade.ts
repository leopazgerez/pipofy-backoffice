import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { ApiClient } from '@data/http/api-client';
import { toDomainError } from '@data/http/to-domain-error';
import { CatalogItem, CatalogListDtoSchema } from '@data/dto/catalogs.dto';

type CatalogName = 'surface-types' | 'court-statuses' | 'plan-types' | 'session-types';

/**
 * Los cuatro catálogos los siembra `prisma:seed` y no cambian en runtime, así que se piden
 * una vez por sesión y se memoiza la promesa.
 *
 * Se memoiza la PROMESA y no el resultado para que dos componentes que arrancan a la vez
 * compartan una sola request. En el error se borra la entrada: si no, un corte de red deja
 * el catálogo roto hasta recargar la página.
 *
 * No extiende SignalStore: no tiene el triple data/loading/error de una pantalla, tiene un
 * cache. Forzarlo dentro de la base sería el primer caso especial que la ensucia.
 */
@Injectable()
export class CatalogsFacade {
  private readonly api = inject(ApiClient);
  private readonly cache = new Map<CatalogName, Promise<CatalogItem[]>>();

  surfaceTypes(): Promise<CatalogItem[]> { return this.get('surface-types'); }
  courtStatuses(): Promise<CatalogItem[]> { return this.get('court-statuses'); }
  planTypes(): Promise<CatalogItem[]> { return this.get('plan-types'); }
  sessionTypes(): Promise<CatalogItem[]> { return this.get('session-types'); }

  private get(name: CatalogName): Promise<CatalogItem[]> {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const pending = firstValueFrom(this.api.get<unknown>(`/catalogs/${name}`))
      .then((raw) => v.parse(CatalogListDtoSchema, raw))
      .catch((err) => {
        this.cache.delete(name);
        throw toDomainError(err);
      });

    this.cache.set(name, pending);
    return pending;
  }
}
