import { describe, it, expect } from 'vitest';
import { attendanceState, formatAttendance, nextSessionDate, occupancyPercent, occupancyState } from './grupos-format';
import { GroupSession } from '@domain/entities/group';

const ses = (over: Partial<GroupSession> = {}): GroupSession => ({
  id: 's1', date: '01/07', time: '18:00', courtName: 'Cancha 1',
  status: 'scheduled', attendance: null, ...over,
});

describe('occupancyState', () => {
  it('lleno cuando llega o pasa la capacidad', () => {
    expect(occupancyState(4, 4)).toBe('full');
    expect(occupancyState(5, 4)).toBe('full');
  });

  it('el borde EXACTO de 50% es low', () => {
    expect(occupancyState(2, 4)).toBe('low');
    expect(occupancyState(1, 4)).toBe('low');
  });

  it('entre 50% y lleno es ok', () => {
    expect(occupancyState(3, 4)).toBe('ok');
  });

  it('capacity 0 es full y nunca divide por cero', () => {
    expect(occupancyState(0, 0)).toBe('full');
  });
});

describe('occupancyPercent', () => {
  it('redondea y topea en 100', () => {
    expect(occupancyPercent(3, 4)).toBe(75);
    expect(occupancyPercent(5, 4)).toBe(100);
  });

  it('capacity 0 da 0, NUNCA NaN', () => {
    // Math.round(0 / 0 * 100) es NaN, y style="width:NaN%" es una declaración inválida
    // que no rompe el build ni el lint: la barra simplemente no se pinta.
    expect(occupancyPercent(0, 0)).toBe(0);
    expect(Number.isNaN(occupancyPercent(0, 0))).toBe(false);
  });
});

describe('attendanceState', () => {
  it('80 EXACTO es high', () => {
    expect(attendanceState(80)).toBe('high');
    expect(attendanceState(92)).toBe('high');
  });

  it('65 EXACTO es mid', () => {
    expect(attendanceState(65)).toBe('mid');
    expect(attendanceState(79)).toBe('mid');
  });

  it('por debajo de 65 es low', () => {
    expect(attendanceState(64)).toBe('low');
    expect(attendanceState(0)).toBe('low');
  });
});

describe('formatAttendance', () => {
  it('sin asistencia tomada devuelve un guión largo', () => {
    expect(formatAttendance(ses({ status: 'scheduled' }))).toBe('—');
    expect(formatAttendance(ses({ status: 'cancelled' }))).toBe('—');
  });

  it('cuenta presentes sobre el total de MARCAS guardadas', () => {
    const s = ses({ status: 'completed', attendance: [
      { memberId: 'r1', present: true }, { memberId: 'r2', present: true },
      { memberId: 'r3', present: true }, { memberId: 'r4', present: false },
    ] });
    expect(formatAttendance(s)).toBe('3/4');
  });

  it('el n/N de una sesión pasada NO cambia si el roster crece o se achica', () => {
    // El denominador sale de session.attendance.length — las marcas que se guardaron esa vez —
    // nunca del roster actual. Si se derivara del roster de hoy, la sesión que fue 4/4 pasaría
    // a mostrarse 4/5 cuando entre alguien nuevo: una asistencia que nunca ocurrió.
    const s = ses({ status: 'completed', attendance: [
      { memberId: 'r1', present: true }, { memberId: 'r2', present: true },
    ] });
    expect(formatAttendance(s)).toBe('2/2');   // la firma no recibe el roster: es imposible que cambie
  });
});

describe('nextSessionDate', () => {
  it('devuelve la fecha de la PRIMERA sesión programada por orden de array', () => {
    expect(nextSessionDate([
      ses({ id: 's1', date: '01/07', status: 'completed', attendance: [] }),
      ses({ id: 's2', date: '08/07', status: 'scheduled' }),
      ses({ id: 's3', date: '15/07', status: 'scheduled' }),
    ])).toBe('08/07');
  });

  it('sin ninguna programada devuelve un guión largo', () => {
    expect(nextSessionDate([ses({ status: 'cancelled' })])).toBe('—');
    expect(nextSessionDate([])).toBe('—');
  });
});
