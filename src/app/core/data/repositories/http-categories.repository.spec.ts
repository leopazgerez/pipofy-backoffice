import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, Observable } from 'rxjs';
import { HttpCategoriesRepository } from './http-categories.repository';
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
      HttpCategoriesRepository,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { repo: TestBed.inject(HttpCategoriesRepository), calls };
}

describe('HttpCategoriesRepository', () => {
  it('list pide /categories y mapea a entidades', async () => {
    const { repo, calls } = setup({ get: of([{ id: '2', name: '4ta', levelOrder: 4, deletedAt: null }]) });
    expect(await repo.list()).toEqual([{ id: '2', name: '4ta', levelOrder: 4 }]);
    expect(calls[0]).toMatchObject({ method: 'get', path: '/categories' });
  });

  it('list descarta las filas con deletedAt', async () => {
    const { repo } = setup({ get: of([
      { id: '2', name: '4ta', levelOrder: 4, deletedAt: null },
      { id: '3', name: '5ta', levelOrder: 5, deletedAt: '2026-07-30T12:00:00.000Z' },
    ]) });
    expect((await repo.list()).map((c) => c.id)).toEqual(['2']);
  });

  it('create manda name y levelOrder, y nada más', async () => {
    const { repo, calls } = setup();
    await repo.create({ name: '4ta', levelOrder: 4 });
    const body = calls[0].body as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(['levelOrder', 'name']);
    expect(calls[0]).toMatchObject({ method: 'post', path: '/categories' });
  });

  it('update usa PATCH y manda levelOrder null cuando se limpió', async () => {
    const { repo, calls } = setup();
    await repo.update('2', { name: 'Iniciación', levelOrder: null });
    expect(calls[0]).toMatchObject({ method: 'patch', path: '/categories/2' });
    expect((calls[0].body as Record<string, unknown>)['levelOrder']).toBeNull();
  });

  it('remove pega DELETE a la categoría', async () => {
    const { repo, calls } = setup();
    await repo.remove('2');
    expect(calls[0]).toMatchObject({ method: 'delete', path: '/categories/2' });
  });
});
