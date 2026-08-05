import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { RosterTableComponent } from './roster-table.component';
import { RosterMember } from '@domain/entities/group';

const miembro = (over: Partial<RosterMember> = {}): RosterMember => ({
  id: 'r1', name: 'Lucía Pereyra', initials: 'LP', category: '7ma',
  credits: 6, attendanceRate: 92, ...over,
});

function mount(roster: RosterMember[], capacity = 4): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(RosterTableComponent);
  fixture.componentRef.setInput('roster', roster);
  fixture.componentRef.setInput('capacity', capacity);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('RosterTableComponent', () => {
  it('una fila por integrante, con nombre, categoría, créditos y % de asistencia', () => {
    const el = mount([miembro(), miembro({ id: 'r2', name: 'Bruno Torres', initials: 'BT', credits: 3, attendanceRate: 78 })]);
    const filas = el.querySelectorAll('tbody tr');
    expect(filas).toHaveLength(2);
    expect(filas[0].textContent).toContain('Lucía Pereyra');
    expect(filas[0].querySelector('.cat-badge')!.textContent).toContain('7ma');
    expect(filas[0].querySelector('.amt')!.textContent).toContain('6');
    expect(filas[0].querySelector('.att-pct')!.textContent).toContain('92%');
  });

  it('los tres umbrales de la barra de asistencia; el estado high NO lleva clase', () => {
    const el = mount([
      miembro({ id: 'r1', attendanceRate: 92 }),   // high
      miembro({ id: 'r2', attendanceRate: 70 }),   // mid
      miembro({ id: 'r3', attendanceRate: 50 }),   // low
    ]);
    const barras = el.querySelectorAll('.att-bar .track i');
    expect(barras[0].className).toBe('');
    expect(barras[1].classList.contains('mid')).toBe(true);
    expect(barras[2].classList.contains('lowp')).toBe(true);
  });

  it('muestra el contador de ocupación en el panel-head', () => {
    const el = mount([miembro(), miembro({ id: 'r2' }), miembro({ id: 'r3' })], 4);
    expect(el.querySelector('.panel-head')!.textContent).toContain('3/4');
  });

  it('las filas NO son clickeables ni tienen botón de abrir (D8: no hay ficha adonde ir)', () => {
    const el = mount([miembro()]);
    expect(el.querySelector('.row-link')).toBeNull();
    expect(el.querySelector('.row-open')).toBeNull();
  });

  it('roster vacío muestra su mensaje', () => {
    const el = mount([]);
    expect(el.textContent).toContain('Nadie inscripto todavía');
  });
});
