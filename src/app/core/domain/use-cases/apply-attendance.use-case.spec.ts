import { describe, it, expect } from 'vitest';
import { applyAttendance, creditsToDiscount } from './apply-attendance.use-case';
import { AttendanceMark, Group, GroupSession } from '../entities/group';
import { GroupSessionNotFoundError, SessionCancelledError } from '../errors';

/** Constructor de grupos para los tests: roster y sesiones a medida, sin depender de la semilla. */
function grupo(opts: {
  creditos: number[];
  estado?: GroupSession['status'];
  attendance?: readonly AttendanceMark[] | null;
}): Group {
  const { creditos, estado = 'scheduled', attendance = null } = opts;
  return {
    id: 'g1', name: 'Grupo', category: '7ma', teacher: 'Diego A.', teacherInitials: 'D',
    day: 'Lun', time: '18:00', courtName: 'Cancha 1', capacity: 4,
    roster: creditos.map((c, i) => ({
      id: `g1-r${i + 1}`, name: `Alumno ${i + 1}`, initials: 'AA',
      category: '7ma', credits: c, attendanceRate: 80,
    })),
    waitlist: [],
    sessions: [{ id: 'g1-s1', date: '01/07', time: '18:00', courtName: 'Cancha 1', status: estado, attendance }],
  };
}

const marcas = (...presentes: boolean[]): AttendanceMark[] =>
  presentes.map((present, i) => ({ memberId: `g1-r${i + 1}`, present }));

const creditos = (g: Group): number[] => g.roster.map((r) => r.credits);

describe('applyAttendance', () => {
  it('1. con la política PRENDIDA descuenta a presentes y ausentes', () => {
    const g = grupo({ creditos: [5, 5, 5] });
    const out = applyAttendance(g, 'g1-s1', marcas(true, false, true), true);
    expect(creditos(out)).toEqual([4, 4, 4]);
  });

  it('2. con la política APAGADA descuenta sólo a los presentes', () => {
    const g = grupo({ creditos: [5, 5, 5] });
    const out = applyAttendance(g, 'g1-s1', marcas(true, false, true), false);
    expect(creditos(out)).toEqual([4, 5, 4]);
  });

  it('3. el crédito hace piso en 0 y no queda negativo', () => {
    // OJO: el roster se construye A MANO con un integrante en 0. La semilla tiene mínimo 1
    // crédito, y bajar de 1 a 0 NO ejercita Math.max — sólo lo ejercita bajar DESDE 0.
    // Un test que use la semilla pasa con o sin la guarda: no probaría nada.
    const g = grupo({ creditos: [0, 2] });
    const out = applyAttendance(g, 'g1-s1', marcas(true, true), true);
    expect(creditos(out)).toEqual([0, 1]);
  });

  it('4. al tomar, la sesión pasa a completed y guarda las marcas', () => {
    const g = grupo({ creditos: [5, 5] });
    const out = applyAttendance(g, 'g1-s1', marcas(true, false), true);
    expect(out.sessions[0].status).toBe('completed');
    expect(out.sessions[0].attendance).toEqual([
      { memberId: 'g1-r1', present: true },
      { memberId: 'g1-r2', present: false },
    ]);
  });

  it('5. editar una sesión ya completed NO vuelve a descontar créditos', () => {
    const g = grupo({ creditos: [5, 5], estado: 'completed', attendance: marcas(true, true) });
    const out = applyAttendance(g, 'g1-s1', marcas(true, false), true);
    expect(creditos(out)).toEqual([5, 5]);                       // intactos
    expect(out.sessions[0].attendance).toEqual(marcas(true, false));  // marcas sí cambian
    expect(out.sessions[0].status).toBe('completed');
  });

  it('6. una sesión cancelled lanza SessionCancelledError', () => {
    const g = grupo({ creditos: [5], estado: 'cancelled' });
    expect(() => applyAttendance(g, 'g1-s1', marcas(true), true)).toThrow(SessionCancelledError);
  });

  it('7. una sesión inexistente en el grupo lanza GroupSessionNotFoundError', () => {
    const g = grupo({ creditos: [5] });
    expect(() => applyAttendance(g, 'g1-s99', marcas(true), true)).toThrow(GroupSessionNotFoundError);
  });

  it('8. no muta el grupo de entrada', () => {
    const g = grupo({ creditos: [5, 5] });
    applyAttendance(g, 'g1-s1', marcas(true, true), true);
    expect(creditos(g)).toEqual([5, 5]);
    expect(g.sessions[0].status).toBe('scheduled');
    expect(g.sessions[0].attendance).toBeNull();
  });

  it('9. reconcilia marcas contra el roster: descarta las huérfanas, asume presente al que falta, y deduplica', () => {
    const g = grupo({ creditos: [5, 5] });
    const out = applyAttendance(g, 'g1-s1', [
      { memberId: 'g1-r1', present: true },
      { memberId: 'g1-r1', present: true },   // duplicada: NO debe descontar dos veces
      { memberId: 'g1-r9', present: false },  // huérfana: el integrante ya no está en el roster
      // g1-r2 no tiene marca: cuenta como presente
    ], false);
    expect(creditos(out)).toEqual([4, 4]);
    expect(out.sessions[0].attendance).toEqual([
      { memberId: 'g1-r1', present: true },
      { memberId: 'g1-r2', present: true },
    ]);
  });

  it('10. creditsToDiscount cuenta INTENCIÓN, no créditos efectivamente descontados', () => {
    // El contador corre en el modal antes de guardar: no ve saldos, así que no puede aplicar
    // el piso en 0. Un integrante en 0 suma al contador igual. Es deliberado, y es la razón de
    // que el toast diga "clase(s) computada(s)" y no "crédito(s) descontados".
    const marks = marcas(true, false);
    expect(creditsToDiscount(marks, true)).toBe(2);
    expect(creditsToDiscount(marks, false)).toBe(1);

    const g = grupo({ creditos: [0, 0] });
    const out = applyAttendance(g, 'g1-s1', marks, true);
    expect(creditsToDiscount(marks, true)).toBe(2);   // el contador dice 2…
    expect(creditos(out)).toEqual([0, 0]);            // …y no se descontó ninguno
  });
});
