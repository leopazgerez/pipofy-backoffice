import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpClassSessionsRepository } from './http-class-sessions.repository';
import { ApiClient } from '../http/api-client';

interface Call { readonly method: string; readonly path: string; readonly body?: unknown }

function setup(responses: Partial<Record<'get' | 'post' | 'delete', Observable<unknown>>> = {}) {
  const calls: Call[] = [];
  const api = {
    get: (path: string) => { calls.push({ method: 'get', path }); return responses.get ?? of([]); },
    post: (path: string, body: unknown) => { calls.push({ method: 'post', path, body }); return responses.post ?? of({}); },
    delete: (path: string) => { calls.push({ method: 'delete', path }); return responses.delete ?? of({}); },
  } as unknown as ApiClient;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      HttpClassSessionsRepository,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { repo: TestBed.inject(HttpClassSessionsRepository), calls };
}

const session = (over: Record<string, unknown> = {}) => ({
  id: '10', courtId: '2', coachId: '5', categoryGroupId: '3',
  startAt: '2026-08-19T21:00:00.000Z', capacity: 4, availableSpots: 1, ...over,
});

describe('HttpClassSessionsRepository.list', () => {
  it('pide un día de más de cada lado', async () => {
    // `ClassSessionsService.list()` arma la ventana con new Date(`${from}T00:00:00Z`): la Z es
    // LITERAL, así que interpreta en UTC. Pidiendo sólo 2026-08-19 desde Argentina (UTC-3) se
    // pierden las clases de 21:00 a 23:59, que en UTC ya son del día 20.
    const { repo, calls } = setup();
    await repo.list('2026-08-19');
    expect(calls[0].path).toBe('/class-sessions?from=2026-08-18&to=2026-08-20');
  });

  it('cruza el fin de mes sin romperse', async () => {
    const { repo, calls } = setup();
    await repo.list('2026-08-31');
    expect(calls[0].path).toBe('/class-sessions?from=2026-08-30&to=2026-09-01');
  });

  it('filtra por fecha LOCAL y descarta lo que quedó fuera del día pedido', async () => {
    // El test-setup fija TZ=America/Argentina/Buenos_Aires (UTC-3): 01:00Z del 20 son las 22:00
    // locales del 19 — cruza la línea del día UTC a propósito. Si el filtro comparara por día
    // UTC en vez de local (el bug que esta tarea arregla), esta sesión quedaría afuera.
    const dentro = session({ id: 'dentro', startAt: '2026-08-20T01:00:00.000Z' });
    const fuera = session({ id: 'fuera', startAt: '2026-08-20T21:00:00.000Z' });
    const sinHora = session({ id: 'sin-hora', startAt: null });
    const { repo } = setup({ get: of([dentro, fuera, sinHora]) });
    const sessions = await repo.list('2026-08-19');
    expect(sessions.map((s) => s.id)).toEqual(['dentro']);
  });

  it('rechaza con un DomainError de validación si el payload deriva', async () => {
    const { repo } = setup({ get: of([{ id: 10 }]) });
    await expect(repo.list('2026-08-19')).rejects.toMatchObject({ kind: 'validation' });
  });
});

describe('HttpClassSessionsRepository — lista de espera', () => {
  it('lee las anotaciones de una sesión', async () => {
    const raw = [{ id: '77', studentId: '4', requestedAt: '2026-08-19T10:00:00.000Z' }];
    const { repo, calls } = setup({ get: of(raw) });
    expect(await repo.waitingList('10')).toEqual([
      { id: '77', studentId: '4', requestedAt: '2026-08-19T10:00:00.000Z' },
    ]);
    expect(calls[0].path).toBe('/class-sessions/10/waiting-list');
  });

  it('anota a un alumno', async () => {
    const { repo, calls } = setup();
    await repo.joinWaitingList('10', '4');
    expect(calls[0]).toMatchObject({
      method: 'post',
      path: '/class-sessions/10/waiting-list',
      body: { studentId: '4' },
    });
  });

  it('da de baja una anotación por SU id, no por el del alumno', async () => {
    const { repo, calls } = setup();
    await repo.leaveWaitingList('77');
    expect(calls[0]).toMatchObject({ method: 'delete', path: '/waiting-list/77' });
  });

  it('propaga el mensaje del backend cuando el alumno ya estaba anotado', async () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { message: 'El alumno ya está en la lista de espera de esta clase' },
    });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.joinWaitingList('10', '4')).rejects.toEqual({
      kind: 'domain',
      message: 'El alumno ya está en la lista de espera de esta clase',
    });
  });
});
