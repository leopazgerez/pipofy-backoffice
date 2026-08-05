import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError, Observable } from 'rxjs';
import { HttpStudentsRepository } from './http-students.repository';
import { ApiClient } from '../http/api-client';
import { StudentDraft } from '@domain/entities/student';

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
      HttpStudentsRepository,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { repo: TestBed.inject<HttpStudentsRepository>(HttpStudentsRepository), calls };
}

const row = (over: Record<string, unknown> = {}) => ({
  id: '1', phone: '1155667788', firstName: 'Ana', lastName: 'Pérez',
  birthDate: '2001-05-03T00:00:00.000Z', categoryId: '4',
  dominantHand: 'diestro', ranking: 12, notes: null, deletedAt: null, ...over,
});

const draft: StudentDraft = {
  phone: '1155667788', firstName: 'Ana', lastName: 'Pérez',
  birthDate: null, categoryId: null, dominantHand: null, ranking: null, notes: null,
};

describe('HttpStudentsRepository.list', () => {
  it('pide /students y mapea a entidades', async () => {
    const { repo, calls } = setup({ get: of([row()]) });
    const students = await repo.list();
    expect(students[0]).toMatchObject({ id: '1', phone: '1155667788', birthDate: '2001-05-03' });
    expect(calls[0]).toMatchObject({ method: 'get', path: '/students' });
  });

  it('descarta las filas con deletedAt', async () => {
    const { repo } = setup({ get: of([row(), row({ id: '2', deletedAt: '2026-07-30T12:00:00.000Z' })]) });
    expect((await repo.list()).map((s: { id: string }) => s.id)).toEqual(['1']);
  });

  it('ignora studentStatusId, que el backend manda y la UI no usa', async () => {
    // No hay GET /catalogs/student-statuses, así que el estado no se puede ni mostrar (§2.3).
    const { repo } = setup({ get: of([row({ studentStatusId: '2' })]) });
    expect(Object.keys((await repo.list())[0])).not.toContain('studentStatusId');
  });

  it('un payload que deriva sale como DomainError de validación', async () => {
    const { repo } = setup({ get: of([{ id: 1 }]) });
    await expect(repo.list()).rejects.toMatchObject({ kind: 'validation' });
  });
});

describe('HttpStudentsRepository escrituras', () => {
  it('create no manda categoryId ni birthDate cuando son null', async () => {
    const { repo, calls } = setup();
    await repo.create(draft);
    const body = calls[0].body as object;
    expect('categoryId' in body).toBe(false);
    expect('birthDate' in body).toBe(false);
  });

  it('update usa PATCH, no PUT', async () => {
    const { repo, calls } = setup();
    await repo.update('7', draft);
    expect(calls[0]).toMatchObject({ method: 'patch', path: '/students/7' });
  });

  it('remove pega DELETE al alumno', async () => {
    const { repo, calls } = setup();
    await repo.remove('7');
    expect(calls[0]).toMatchObject({ method: 'delete', path: '/students/7' });
  });

  it('un teléfono duplicado llega como error de dominio con el copy del backend', async () => {
    // @@unique([clubId, phone]) → P2002 → ConflictException 409 (§3.7).
    const err = new HttpErrorResponse({
      status: 409,
      error: { statusCode: 409, message: 'Ya existe un alumno con ese teléfono en este club' },
    });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.create(draft))
      .rejects.toEqual({ kind: 'domain', message: 'Ya existe un alumno con ese teléfono en este club' });
  });
});
