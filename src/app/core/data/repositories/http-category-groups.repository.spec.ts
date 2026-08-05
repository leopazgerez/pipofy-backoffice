import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Observable } from 'rxjs';
import { HttpCategoryGroupsRepository } from './http-category-groups.repository';
import { ApiClient } from '../http/api-client';

interface Call { readonly method: string; readonly path: string; readonly body?: unknown }

function setup(responses: Partial<Record<'get' | 'post' | 'patch' | 'delete', Observable<unknown>>> = {}) {
  const calls: Call[] = [];
  const api = {
    get: (path: string) => { calls.push({ method: 'get', path }); return responses.get ?? of([]); },
    post: (path: string, body: unknown) => { calls.push({ method: 'post', path, body }); return responses.post ?? of({}); },
    patch: (path: string, body: unknown) => { calls.push({ method: 'patch', path, body }); return responses.patch ?? of({}); },
    delete: (path: string) => { calls.push({ method: 'delete', path }); return responses.delete ?? of({}); },
  } as unknown as ApiClient;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      HttpCategoryGroupsRepository,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { repo: TestBed.inject(HttpCategoryGroupsRepository), calls };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: '1', name: 'Principiantes', deletedAt: null, ...over,
});

describe('HttpCategoryGroupsRepository.list', () => {
  it('pide /category-groups y mapea a entidades', async () => {
    const { repo, calls } = setup({ get: of([row()]) });
    expect(await repo.list()).toEqual([{ id: '1', name: 'Principiantes' }]);
    expect(calls[0]).toMatchObject({ method: 'get', path: '/category-groups' });
  });

  it('descarta las filas con deletedAt', async () => {
    // category-groups.service.list() NO excluye los borrados (§3): sin este filtro, un
    // grupo eliminado sigue apareciendo después de que la API responde 200.
    const { repo } = setup({ get: of([row(), row({ id: '2', deletedAt: '2026-07-30T12:00:00.000Z' })]) });
    expect((await repo.list()).map((g) => g.id)).toEqual(['1']);
  });

  it('ignora las claves que el backend manda de más', async () => {
    // Prisma devuelve la fila cruda: clubId, createdAt y updatedAt vienen y se descartan.
    const { repo } = setup({ get: of([row({ clubId: '9', createdAt: 'x', updatedAt: 'y' })]) });
    expect(await repo.list()).toEqual([{ id: '1', name: 'Principiantes' }]);
  });

  it('un payload que deriva sale como DomainError de validación', async () => {
    const { repo } = setup({ get: of([{ id: 1 }]) });   // id numérico: la API los manda string
    await expect(repo.list()).rejects.toMatchObject({ kind: 'validation' });
  });
});

describe('HttpCategoryGroupsRepository escrituras', () => {
  it('create manda POST con sólo el nombre', async () => {
    const { repo, calls } = setup();
    await repo.create({ name: 'Avanzados' });
    expect(calls[0]).toMatchObject({ method: 'post', path: '/category-groups' });
    expect(Object.keys(calls[0].body as object)).toEqual(['name']);
  });

  it('update usa PATCH, no PUT', async () => {
    const { repo, calls } = setup();
    await repo.update('7', { name: 'Avanzados' });
    expect(calls[0]).toMatchObject({ method: 'patch', path: '/category-groups/7' });
  });

  it('remove pega DELETE al grupo', async () => {
    const { repo, calls } = setup();
    await repo.remove('7');
    expect(calls[0]).toMatchObject({ method: 'delete', path: '/category-groups/7' });
  });

  it('propaga el mensaje del backend en un 400', async () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: 'name debe ser un string' },
    });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.create({ name: 'X' }))
      .rejects.toEqual({ kind: 'domain', message: 'name debe ser un string' });
  });
});
