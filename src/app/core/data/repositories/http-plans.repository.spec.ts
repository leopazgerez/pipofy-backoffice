import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Observable } from 'rxjs';
import { HttpPlansRepository } from './http-plans.repository';
import { ApiClient } from '../http/api-client';
import { PlanDraft } from '@domain/entities/plan';

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
      HttpPlansRepository,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { repo: TestBed.inject(HttpPlansRepository), calls };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: '1', name: 'Mensual 8', planTypeId: '2', coachId: '5',
  classCount: 8, price: '12000.5', validityDays: 30, active: true, deletedAt: null, ...over,
});

const draft: PlanDraft = {
  name: 'Mensual 8', planTypeId: '2', coachId: null,
  classCount: 8, price: '12000.5', validityDays: 30, active: true,
};

describe('HttpPlansRepository.list', () => {
  it('pide /plans y mapea a entidades', async () => {
    const { repo, calls } = setup({ get: of([row()]) });
    const plans = await repo.list();
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ id: '1', name: 'Mensual 8', planTypeId: '2', coachId: '5' });
    expect(calls[0]).toMatchObject({ method: 'get', path: '/plans' });
  });

  it('descarta las filas con deletedAt', async () => {
    const { repo } = setup({ get: of([row(), row({ id: '2', deletedAt: '2026-07-30T12:00:00.000Z' })]) });
    expect((await repo.list()).map((p) => p.id)).toEqual(['1']);
  });

  it('acepta el precio como número sin romper el parseo', async () => {
    const { repo } = setup({ get: of([row({ price: 12000.5 })]) });
    expect((await repo.list())[0].price).toBe('12000.5');
  });

  it('un payload que deriva sale como DomainError de validación', async () => {
    const { repo } = setup({ get: of([{ id: 1 }]) });
    await expect(repo.list()).rejects.toMatchObject({ kind: 'validation' });
  });
});

describe('HttpPlansRepository escrituras', () => {
  it('create no manda coachId cuando el plan no tiene profesor', async () => {
    // Mandarlo en null hace que el backend ejecute BigInt(null) y devuelva 500 (§3.2).
    const { repo, calls } = setup();
    await repo.create(draft);
    expect('coachId' in (calls[0].body as object)).toBe(false);
  });

  it('update usa PATCH, no PUT', async () => {
    const { repo, calls } = setup();
    await repo.update('7', draft);
    expect(calls[0]).toMatchObject({ method: 'patch', path: '/plans/7' });
  });

  it('remove pega DELETE al plan', async () => {
    const { repo, calls } = setup();
    await repo.remove('7');
    expect(calls[0]).toMatchObject({ method: 'delete', path: '/plans/7' });
  });

  it('propaga el mensaje del backend en un 400', async () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: 'coachId inválido: no pertenece a este club' },
    });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.create({ ...draft, coachId: '99' }))
      .rejects.toEqual({ kind: 'domain', message: 'coachId inválido: no pertenece a este club' });
  });
});
