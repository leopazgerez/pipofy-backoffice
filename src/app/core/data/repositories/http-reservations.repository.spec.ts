import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpReservationsRepository } from './http-reservations.repository';
import { ApiClient } from '../http/api-client';

interface Call { readonly method: string; readonly path: string; readonly body?: unknown }

function setup(responses: Partial<Record<'post' | 'delete', Observable<unknown>>> = {}) {
  const calls: Call[] = [];
  const api = {
    post: (path: string, body: unknown) => {
      calls.push({ method: 'post', path, body });
      return responses.post ?? of({ id: '55', holdExpiresAt: '2026-08-19T21:30:00.000Z' });
    },
    delete: (path: string) => { calls.push({ method: 'delete', path }); return responses.delete ?? of({}); },
  } as unknown as ApiClient;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      HttpReservationsRepository,
      { provide: ApiClient, useValue: api },
    ],
  });
  return { repo: TestBed.inject(HttpReservationsRepository), calls };
}

const draft = { sessionId: '10', studentId: '4', studentPlanId: '9' };

describe('HttpReservationsRepository.reserve', () => {
  it('postea a la sesión y devuelve el id del hold', async () => {
    // Es el ÚNICO momento en que el front ve este id: no existe GET /reservations.
    const { repo, calls } = setup();
    expect(await repo.reserve(draft)).toEqual({
      id: '55',
      holdExpiresAt: '2026-08-19T21:30:00.000Z',
    });
    expect(calls[0]).toEqual({
      method: 'post',
      path: '/class-sessions/10/reservations',
      body: { studentId: '4', studentPlanId: '9' },
    });
  });

  it('no manda sessionId en el cuerpo: va en la URL y el ValidationPipe rechaza los extras', async () => {
    const { repo, calls } = setup();
    await repo.reserve(draft);
    expect(Object.keys(calls[0].body as object).sort()).toEqual(['studentId', 'studentPlanId'].sort());
  });

  it('propaga el mensaje del backend cuando no hay cupo', async () => {
    const err = new HttpErrorResponse({ status: 409, error: { message: 'No hay cupo disponible' } });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.reserve(draft)).rejects.toEqual({
      kind: 'domain',
      message: 'No hay cupo disponible',
    });
  });

  it('propaga el 400 de categoría, que el front no puede prevenir', async () => {
    // No hay GET que devuelva los items de un grupo, así que el modal no puede filtrar el
    // select de alumnos por categoría: el mensaje del backend ES el feedback.
    const err = new HttpErrorResponse({
      status: 400,
      error: { message: 'El alumno no pertenece a la categoría de esta clase' },
    });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.reserve(draft)).rejects.toEqual({
      kind: 'domain',
      message: 'El alumno no pertenece a la categoría de esta clase',
    });
  });
});

describe('HttpReservationsRepository.confirm / cancel', () => {
  it('confirm postea al endpoint de la reserva', async () => {
    const { repo, calls } = setup();
    await repo.confirm('55');
    expect(calls[0]).toMatchObject({ method: 'post', path: '/reservations/55/confirm' });
  });

  it('cancel borra la reserva', async () => {
    const { repo, calls } = setup();
    await repo.cancel('55');
    expect(calls[0]).toMatchObject({ method: 'delete', path: '/reservations/55' });
  });

  it('confirm propaga el 409 del hold vencido', async () => {
    const err = new HttpErrorResponse({ status: 409, error: { message: 'El hold expiró' } });
    const { repo } = setup({ post: throwError(() => err) });
    await expect(repo.confirm('55')).rejects.toEqual({ kind: 'domain', message: 'El hold expiró' });
  });
});
