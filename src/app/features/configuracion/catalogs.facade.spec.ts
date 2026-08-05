import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Observable } from 'rxjs';
import { CatalogsFacade } from './catalogs.facade';
import { ApiClient } from '@data/http/api-client';

function setup(get: (path: string) => Observable<unknown>) {
  const paths: string[] = [];
  const api = { get: (p: string) => { paths.push(p); return get(p); } } as unknown as ApiClient;
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      CatalogsFacade,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { facade: TestBed.inject(CatalogsFacade), paths };
}

describe('CatalogsFacade', () => {
  it('pide el catálogo y lo valida', async () => {
    const { facade, paths } = setup(() => of([{ id: '1', name: 'cemento' }]));
    expect(await facade.surfaceTypes()).toEqual([{ id: '1', name: 'cemento' }]);
    expect(paths).toEqual(['/catalogs/surface-types']);
  });

  it('dos llamadas seguidas hacen UNA sola request', async () => {
    // Los cuatro catálogos los siembra prisma:seed y no cambian en runtime.
    const { facade, paths } = setup(() => of([{ id: '1', name: 'cemento' }]));
    await Promise.all([facade.surfaceTypes(), facade.surfaceTypes()]);
    await facade.surfaceTypes();
    expect(paths).toEqual(['/catalogs/surface-types']);
  });

  it('después de un fallo, la llamada siguiente reintenta', async () => {
    // Sin borrar la entrada del cache, un corte de red dejaría el catálogo roto
    // hasta recargar la página entera.
    let first = true;
    const { facade, paths } = setup(() => {
      if (first) { first = false; return throwError(() => new HttpErrorResponse({ status: 0 })); }
      return of([{ id: '1', name: 'cemento' }]);
    });

    await expect(facade.surfaceTypes()).rejects.toEqual({ kind: 'network' });
    expect(await facade.surfaceTypes()).toEqual([{ id: '1', name: 'cemento' }]);
    expect(paths).toHaveLength(2);
  });

  it('planTypes() pide /catalogs/plan-types y memoiza', async () => {
    const { facade, paths } = setup(() => of([{ id: '1', name: 'mensual_grupal' }]));
    await facade.planTypes();
    await facade.planTypes();
    expect(paths).toEqual(['/catalogs/plan-types']);
  });
});
