import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { toGroupsSnapshot } from './groups.mapper';
import { GroupsDto, GroupsDtoSchema } from '../dto/groups.dto';
import { GROUPS_SEED } from '../repositories/groups.seed';

/** DTO mínimo de un grupo, con las sesiones que pida cada test. */
function dto(sessions: GroupsDto['groups'][number]['sessions']): GroupsDto {
  return {
    club_id: 'c1',
    groups: [{
      id: '1', name: 'Grupo', category: '7ma', teacher: 'Diego A.', teacher_initials: 'D',
      day: 'Lun', time: '18:00', court_name: 'Cancha 1', capacity: 4,
      roster: [{ id: '1-r1', name: 'Lucía Pereyra', initials: 'LP', category: '7ma', credits: 6, attendance_rate: 92 }],
      waitlist: [{ name: 'Julián Vera', initials: 'JV', since: 'hace 2 días' }],
      sessions,
    }],
  };
}

const ses = (over: Partial<GroupsDto['groups'][number]['sessions'][number]> = {}) => ({
  id: '1-s1', date: '01/07', time: '18:00', court_name: 'Cancha 1',
  status: 'prog' as const, attendance: null, ...over,
});

describe('toGroupsSnapshot', () => {
  it('mapea snake_case a camelCase', () => {
    const snap = toGroupsSnapshot(dto([ses()]));
    expect(snap.clubId).toBe('c1');
    const g = snap.groups[0];
    expect(g.teacherInitials).toBe('D');
    expect(g.courtName).toBe('Cancha 1');
    expect(g.roster[0]).toEqual({
      id: '1-r1', name: 'Lucía Pereyra', initials: 'LP', category: '7ma', credits: 6, attendanceRate: 92,
    });
    expect(g.waitlist[0]).toEqual({ name: 'Julián Vera', initials: 'JV', since: 'hace 2 días' });
    expect(g.sessions[0].courtName).toBe('Cancha 1');
  });

  it('mapea los tres status', () => {
    const snap = toGroupsSnapshot(dto([
      ses({ id: '1-s1', status: 'prog', attendance: null }),
      ses({ id: '1-s2', status: 'done', attendance: [{ member_id: '1-r1', present: true }] }),
      ses({ id: '1-s3', status: 'canc', attendance: null }),
    ]));
    expect(snap.groups[0].sessions.map((s) => s.status)).toEqual(['scheduled', 'completed', 'cancelled']);
  });

  it('una sesión done trae attendance con una marca por integrante; prog y canc traen null', () => {
    const snap = toGroupsSnapshot(dto([
      ses({ id: '1-s1', status: 'done', attendance: [{ member_id: '1-r1', present: false }] }),
      ses({ id: '1-s2', status: 'prog', attendance: null }),
      ses({ id: '1-s3', status: 'canc', attendance: null }),
    ]));
    expect(snap.groups[0].sessions[0].attendance).toEqual([{ memberId: '1-r1', present: false }]);
    expect(snap.groups[0].sessions[1].attendance).toBeNull();
    expect(snap.groups[0].sessions[2].attendance).toBeNull();
  });

  it('RECHAZA un DTO que viole la invariante status⟺attendance', () => {
    // done sin marcas: es el estado que produce una semilla mal expandida, y hace que el modo
    // editar del modal arranque leyendo null.
    expect(() => toGroupsSnapshot(dto([ses({ status: 'done', attendance: null })])))
      .toThrow(/invariante/i);
    // marcas en una sesión que no está completada
    expect(() => toGroupsSnapshot(dto([ses({ status: 'prog', attendance: [{ member_id: '1-r1', present: true }] })])))
      .toThrow(/invariante/i);
    expect(() => toGroupsSnapshot(dto([ses({ status: 'canc', attendance: [{ member_id: '1-r1', present: true }] })])))
      .toThrow(/invariante/i);
  });
});

describe('GROUPS_SEED', () => {
  it('parsea contra el schema y mapea sin violar la invariante', () => {
    const snap = toGroupsSnapshot(v.parse(GroupsDtoSchema, GROUPS_SEED));
    expect(snap.groups).toHaveLength(6);
  });

  it('la sesión 3-s1 es MIXTA: sin eso, el modo editar del modal es intesteable', () => {
    // Todas las sesiones completadas de la maqueta son 100% presentes, y el modo TOMAR también
    // arranca con todos presentes. Si la semilla las expandiera literalmente, el test de
    // "editar restaura las marcas guardadas" daría el mismo resultado que si la restauración
    // no estuviera implementada. Esta sesión es el único dato que los distingue.
    const snap = toGroupsSnapshot(v.parse(GroupsDtoSchema, GROUPS_SEED));
    const sesion = snap.groups.find((g) => g.id === '3')!.sessions.find((s) => s.id === '3-s1')!;
    expect(sesion.status).toBe('completed');
    expect(sesion.attendance!.filter((m) => m.present)).toHaveLength(3);
    expect(sesion.attendance!.filter((m) => !m.present)).toHaveLength(1);
  });

  it('las sesiones vienen en orden cronológico ascendente (de eso depende nextSessionDate)', () => {
    const snap = toGroupsSnapshot(v.parse(GroupsDtoSchema, GROUPS_SEED));
    for (const g of snap.groups) {
      const dias = g.sessions.map((s) => Number(s.date.slice(0, 2)));
      expect([...dias].sort((a, b) => a - b)).toEqual(dias);
    }
  });
});
