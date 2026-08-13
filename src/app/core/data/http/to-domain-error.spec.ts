import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import * as v from 'valibot';
import { toDomainError } from './to-domain-error';
import { ClubInactiveError } from '@domain/errors';

describe('toDomainError', () => {
  it('maps 404 to not-found', () => {
    expect(toDomainError(new HttpErrorResponse({ status: 404 }))).toEqual({ kind: 'not-found' });
  });
  it('maps 401 to unauthorized', () => {
    expect(toDomainError(new HttpErrorResponse({ status: 401 }))).toEqual({ kind: 'unauthorized' });
  });
  it('maps status 0 to network', () => {
    expect(toDomainError(new HttpErrorResponse({ status: 0 }))).toEqual({ kind: 'network' });
  });
  it('maps a Valibot failure to validation with issues', () => {
    let caught: unknown;
    try {
      v.parse(v.string(), 123);
    } catch (e) {
      caught = e;
    }
    const result = toDomainError(caught);
    expect(result.kind).toBe('validation');
  });
  it('maps anything else to unknown', () => {
    expect(toDomainError(new Error('boom'))).toMatchObject({ kind: 'unknown' });
  });
  it('is idempotent — an existing DomainError passes through unchanged', () => {
    const e = { kind: 'not-found' } as const;
    expect(toDomainError(e)).toBe(e);
  });
  it('maps a DomainRuleError to a domain kind carrying its message', () => {
    expect(toDomainError(new ClubInactiveError('c1'))).toEqual({
      kind: 'domain',
      message: 'Club c1 is inactive',
    });
  });

  it('mapea 403 a forbidden, no a unauthorized', () => {
    // 403 con rol `superprofesor` es permanente: decirle "tu sesión expiró" lo manda a
    // reloguearse para chocar con exactamente lo mismo.
    expect(toDomainError(new HttpErrorResponse({ status: 403 }))).toEqual({ kind: 'forbidden' });
  });

  it('mapea 400 con message string al mensaje del backend', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: {
        statusCode: 400,
        message: 'surfaceTypeId inválido: no existe',
        error: 'Bad Request',
      },
    });
    expect(toDomainError(err)).toEqual({
      kind: 'domain',
      message: 'surfaceTypeId inválido: no existe',
    });
  });

  it('mapea 400 con message string[] (la forma del ValidationPipe) uniendo los mensajes', () => {
    const err = new HttpErrorResponse({
      status: 400,
      error: { statusCode: 400, message: ['name must be a string', 'indoor must be a boolean'] },
    });
    expect(toDomainError(err)).toEqual({
      kind: 'domain',
      message: 'name must be a string indoor must be a boolean',
    });
  });

  it('mapea 409 al mensaje del backend', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { statusCode: 409, message: 'Ya existe un alumno con ese teléfono en este club' },
    });
    expect(toDomainError(err)).toEqual({
      kind: 'domain',
      message: 'Ya existe un alumno con ese teléfono en este club',
    });
  });

  it('un 400 sin cuerpo útil cae en el mensaje genérico', () => {
    const err = new HttpErrorResponse({ status: 400, error: null });
    expect(toDomainError(err)).toEqual({
      kind: 'domain',
      message: 'No pudimos guardar los cambios. Revisá los datos e intentá de nuevo.',
    });
  });
});
