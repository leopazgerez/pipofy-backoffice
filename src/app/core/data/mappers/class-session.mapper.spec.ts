import { describe, it, expect } from 'vitest';
import { toClassSession, toWaitingListEntry } from './class-session.mapper';

describe('toClassSession', () => {
  it('mapea la fila tal cual', () => {
    expect(toClassSession({
      id: '10', courtId: '2', coachId: '5', categoryGroupId: '3',
      startAt: '2026-08-19T21:00:00.000Z', capacity: 4, availableSpots: 1,
    })).toEqual({
      id: '10', courtId: '2', coachId: '5', categoryGroupId: '3',
      startAt: '2026-08-19T21:00:00.000Z', capacity: 4, availableSpots: 1,
    });
  });

  it('normaliza capacity null a 0', () => {
    // `ClassSession.capacity` es nullable en Prisma. La normalización vive acá y no en cada
    // pantalla para que "cupo" sea siempre un número.
    expect(toClassSession({
      id: '10', courtId: '2', coachId: '5', categoryGroupId: '3',
      startAt: null, capacity: null, availableSpots: 0,
    }).capacity).toBe(0);
  });
});

describe('toWaitingListEntry', () => {
  it('mapea id, alumno y fecha de pedido', () => {
    expect(toWaitingListEntry({ id: '77', studentId: '4', requestedAt: '2026-08-19T10:00:00.000Z' }))
      .toEqual({ id: '77', studentId: '4', requestedAt: '2026-08-19T10:00:00.000Z' });
  });
});
