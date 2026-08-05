import { describe, it, expect } from 'vitest';
import { InMemoryGroupsRepository } from './in-memory-groups.repository';
import { GroupNotFoundError, GroupSessionNotFoundError } from '@domain/errors';
import { AttendanceMark } from '@domain/entities/group';

const repo = () => new InMemoryGroupsRepository(0);

/** Marcas de "todos presentes" para el roster del grupo 1 (4 integrantes). */
const TODOS_PRESENTES: AttendanceMark[] = ['1-r1', '1-r2', '1-r3', '1-r4']
  .map((memberId) => ({ memberId, present: true }));

describe('InMemoryGroupsRepository', () => {
  it('getSnapshot devuelve los 6 grupos de la semilla', async () => {
    const snap = await repo().getGroups('c1');
    expect(snap.clubId).toBe('c1');
    expect(snap.groups).toHaveLength(6);
  });

  it('EL ESTADO PERSISTE entre llamadas: lo guardado se lee en la lectura siguiente', async () => {
    // Fue un bug real del repo del dashboard: re-parsear la semilla en cada lectura hacía
    // desaparecer las mutaciones. La semilla se parsea UNA vez, en un campo.
    const r = repo();
    await r.saveAttendance('c1', {
      groupId: '1', sessionId: '1-s2', marks: TODOS_PRESENTES, discountAbsences: true,
    });

    const snap = await r.getGroups('c1');
    const g = snap.groups.find((x) => x.id === '1')!;
    expect(g.sessions.find((s) => s.id === '1-s2')!.status).toBe('completed');
    expect(g.roster.map((m) => m.credits)).toEqual([5, 2, 7, 3]);   // eran 6, 3, 8, 4
  });

  it('saveAttendance devuelve el snapshot nuevo completo', async () => {
    const snap = await repo().saveAttendance('c1', {
      groupId: '1', sessionId: '1-s2', marks: TODOS_PRESENTES, discountAbsences: true,
    });
    expect(snap.groups).toHaveLength(6);
    expect(snap.groups.find((g) => g.id === '1')!.roster[0].credits).toBe(5);
  });

  it('un grupo inexistente rechaza con GroupNotFoundError', async () => {
    await expect(repo().saveAttendance('c1', {
      groupId: '99', sessionId: '1-s2', marks: [], discountAbsences: true,
    })).rejects.toThrow(GroupNotFoundError);
  });

  it('una sesión inexistente rechaza con GroupSessionNotFoundError', async () => {
    await expect(repo().saveAttendance('c1', {
      groupId: '1', sessionId: '1-s99', marks: [], discountAbsences: true,
    })).rejects.toThrow(GroupSessionNotFoundError);
  });

  it('DOS saveAttendance EN VUELO sobre la misma sesión descuentan UNA sola vez', async () => {
    // Ésta es la defensa anti-doble-descuento y sólo funciona si la mutación de this.snapshot
    // es SÍNCRONA respecto de la llamada — o sea, ANTES del await de la latencia simulada.
    // Si se esperara la latencia primero, las dos llamadas leerían status 'scheduled', las dos
    // entrarían en modo tomar y las dos descontarían.
    const r = new InMemoryGroupsRepository(50);
    const req = { groupId: '1', sessionId: '1-s2', marks: TODOS_PRESENTES, discountAbsences: true };

    const [, segunda] = await Promise.all([r.saveAttendance('c1', req), r.saveAttendance('c1', req)]);

    // La segunda encontró la sesión ya 'completed' → modo editar → no toca créditos.
    expect(segunda.groups.find((g) => g.id === '1')!.roster.map((m) => m.credits)).toEqual([5, 2, 7, 3]);
  });
});
