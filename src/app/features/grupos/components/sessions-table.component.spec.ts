import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SessionsTableComponent } from './sessions-table.component';
import { GroupSession } from '@domain/entities/group';

const ses = (over: Partial<GroupSession> = {}): GroupSession => ({
  id: 's1', date: '01/07', time: '18:00', courtName: 'Cancha 1',
  status: 'scheduled', attendance: null, ...over,
});

function mount(sessions: GroupSession[], canTake = true) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(SessionsTableComponent);
  fixture.componentRef.setInput('sessions', sessions);
  fixture.componentRef.setInput('canTake', canTake);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('SessionsTableComponent', () => {
  it('pinta el pill de cada estado con su label', () => {
    const { el } = mount([
      ses({ id: 's1', status: 'scheduled' }),
      ses({ id: 's2', status: 'completed', attendance: [{ memberId: 'r1', present: true }] }),
      ses({ id: 's3', status: 'cancelled' }),
    ]);
    const pills = el.querySelectorAll('.ss-pill');
    expect(pills[0].classList.contains('prog')).toBe(true);
    expect(pills[0].textContent).toContain('Programada');
    expect(pills[1].classList.contains('done')).toBe(true);
    expect(pills[1].textContent).toContain('Completada');
    expect(pills[2].classList.contains('canc')).toBe(true);
    expect(pills[2].textContent).toContain('Cancelada');
  });

  it('la asistencia sale de formatAttendance', () => {
    const { el } = mount([
      ses({ id: 's1', status: 'completed', attendance: [
        { memberId: 'r1', present: true }, { memberId: 'r2', present: false },
      ] }),
      ses({ id: 's2', status: 'scheduled' }),
    ]);
    const celdas = el.querySelectorAll('.ses-att');
    expect(celdas[0].textContent).toContain('1/2');
    expect(celdas[1].textContent).toContain('—');
  });

  it('programada ofrece Tomar asistencia; completada ofrece Ver / editar', () => {
    const { el } = mount([
      ses({ id: 's1', status: 'scheduled' }),
      ses({ id: 's2', status: 'completed', attendance: [] }),
    ]);
    const botones = el.querySelectorAll('tbody button');
    expect(botones[0].textContent).toContain('Tomar asistencia');
    expect(botones[1].textContent).toContain('Ver / editar');
  });

  it('una sesión CANCELADA no ofrece botón, sólo un guión', () => {
    const { el } = mount([ses({ status: 'cancelled' })]);
    expect(el.querySelector('tbody button')).toBeNull();
    expect(el.querySelector('.ses-none')!.textContent).toContain('—');
  });

  it('emite la sesión elegida al clickear', () => {
    const { fixture, el } = mount([ses({ id: 's7', status: 'scheduled' })]);
    let emitida: GroupSession | undefined;
    fixture.componentInstance.attendanceRequested.subscribe((s) => (emitida = s));
    el.querySelector<HTMLButtonElement>('tbody button')!.click();
    expect(emitida?.id).toBe('s7');
  });

  it('con canTake false el botón de tomar queda DESHABILITADO (roster vacío)', () => {
    const { el } = mount([ses({ status: 'scheduled' })], false);
    expect(el.querySelector<HTMLButtonElement>('tbody button')!.disabled).toBe(true);
  });

  it('sin sesiones muestra su mensaje', () => {
    const { el } = mount([]);
    expect(el.textContent).toContain('Este grupo todavía no tiene sesiones');
  });
});
