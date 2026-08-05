import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CourtGridComponent } from './court-grid.component';
import { CourtGrid, CourtSession } from '@domain/entities/dashboard-snapshot';

const grid: CourtGrid = {
  courts: [
    { name: 'Cancha 1', surface: 'padel', meta: 'Pádel · Diego A.' },
    { name: 'Central', surface: 'tenis', meta: 'Tenis · Diego A.' },
  ],
  hours: ['16:00'],
  sessions: [[
    { category: '8va', professor: 'Diego A.', initials: 'D', occupied: 4, capacity: 4, state: 'full' },
    null,
  ]],
};

function mount() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CourtGridComponent);
  fixture.componentRef.setInput('grid', grid);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('CourtGridComponent', () => {
  it('renderiza encabezados de cancha con superficie y meta', () => {
    const { el } = mount();
    expect(el.querySelectorAll('.court-grid .ch:not(.corner)').length).toBe(2);
    expect(el.querySelector('.surf.padel')).toBeTruthy();
    expect(el.querySelector('.surf.tenis')).toBeTruthy();
    expect(el.textContent).toContain('Pádel · Diego A.');
  });

  it('renderiza una sesión con ocupación y flag, y un slot vacío', () => {
    const { el } = mount();
    const sess = el.querySelector('.sess');
    expect(sess?.classList.contains('full')).toBe(true);
    expect(sess?.textContent).toContain('8va');
    expect(sess?.textContent).toContain('4/4');
    expect(el.querySelector('.slot.empty')).toBeTruthy();
  });

  it('la sesión es un <button> (foco por teclado + Enter/Space, gratis)', () => {
    const { el } = mount();
    const btn = el.querySelector<HTMLButtonElement>('button.sess');
    expect(btn).toBeTruthy();
    expect(btn?.type).toBe('button');
  });

  it('un click en la sesión emite sessionSelected con su cancha y hora', () => {
    const { fixture, el } = mount();
    const emitted: { session: CourtSession; courtName: string; hour: string }[] = [];
    fixture.componentInstance.sessionSelected.subscribe((e) => emitted.push(e));

    el.querySelector<HTMLButtonElement>('button.sess')!.click();

    expect(emitted.length).toBe(1);
    expect(emitted[0].courtName).toBe('Cancha 1');
    expect(emitted[0].hour).toBe('16:00');
    expect(emitted[0].session.category).toBe('8va');
  });

  it('un slot vacío no emite nada (no hay botón que clickear)', () => {
    const { el } = mount();
    expect(el.querySelectorAll('button.sess').length).toBe(1);   // la grilla tiene 1 sesión + 1 null
  });

  it('marca el flag correcto según el estado', () => {
    const { el } = mount();
    expect(el.querySelector('.s-flag')).toBeNull(); // 'full' no lleva flag
  });
});
