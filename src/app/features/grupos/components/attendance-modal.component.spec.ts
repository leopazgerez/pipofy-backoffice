import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AttendanceModalComponent, AttendanceTarget } from './attendance-modal.component';
import { AttendanceMark, Group, GroupSession } from '@domain/entities/group';

const GRUPO: Group = {
  id: '1', name: '7ma+8va · Lunes PM', category: '7ma+8va',
  teacher: 'Diego A.', teacherInitials: 'D',
  day: 'Lun', time: '18:00', courtName: 'Cancha 1', capacity: 4,
  roster: [
    { id: '1-r1', name: 'Lucía Pereyra', initials: 'LP', category: '7ma', credits: 6, attendanceRate: 92 },
    { id: '1-r2', name: 'Bruno Torres',  initials: 'BT', category: '7ma', credits: 3, attendanceRate: 78 },
  ],
  waitlist: [],
  sessions: [],
};

const ses = (over: Partial<GroupSession> = {}): GroupSession => ({
  id: '1-s2', date: '08/07', time: '18:00', courtName: 'Cancha 1',
  status: 'scheduled', attendance: null, ...over,
});

function mount(session: GroupSession) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(AttendanceModalComponent);
  const target: AttendanceTarget = { group: GRUPO, session };
  fixture.componentRef.setInput('target', target);
  fixture.detectChanges();
  fixture.componentInstance.open();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
}

const segmentos = (el: HTMLElement) => el.querySelectorAll<HTMLButtonElement>('.segp');

describe('AttendanceModalComponent', () => {
  it('modo TOMAR: título, botón, política visible y todos presentes', () => {
    const { el } = mount(ses({ status: 'scheduled' }));
    expect(el.querySelector('h3')!.textContent).toContain('Tomar asistencia');
    expect(el.querySelector('[data-testid="confirm"]')!.textContent).toContain('Confirmar asistencia');
    expect(el.querySelector('.att-policy')).toBeTruthy();
    // 2 integrantes × 2 botones; los "Presente" (índices 0 y 2) arrancan activos.
    expect(segmentos(el)[0].classList.contains('on-p')).toBe(true);
    expect(segmentos(el)[2].classList.contains('on-p')).toBe(true);
  });

  it('modo EDITAR: título, botón, política OCULTA y las marcas GUARDADAS', () => {
    // Este es el test que la semilla mixta hace significativo: si arrancara todo-presente como
    // el modo tomar, pasaría igual sin que la restauración de marcas exista.
    const guardadas: AttendanceMark[] = [
      { memberId: '1-r1', present: true },
      { memberId: '1-r2', present: false },
    ];
    const { el } = mount(ses({ status: 'completed', attendance: guardadas }));
    expect(el.querySelector('h3')!.textContent).toContain('Editar asistencia');
    expect(el.querySelector('[data-testid="confirm"]')!.textContent).toContain('Guardar cambios');
    expect(el.querySelector('.att-policy')).toBeNull();
    expect(segmentos(el)[0].classList.contains('on-p')).toBe(true);    // Lucía presente
    expect(segmentos(el)[3].classList.contains('on-a')).toBe(true);    // Bruno AUSENTE
  });

  it('el subtítulo lleva grupo · fecha hora · cancha', () => {
    const { el } = mount(ses());
    expect(el.querySelector('.m-sub')!.textContent).toContain('7ma+8va · Lunes PM · 08/07 18:00 · Cancha 1');
  });

  it('el resumen se actualiza al togglear', () => {
    const { fixture, el } = mount(ses());
    expect(el.querySelector('.att-summary')!.textContent).toContain('Presentes 2');

    segmentos(el)[3].click();          // Bruno → Ausente
    fixture.detectChanges();
    const resumen = el.querySelector('.att-summary')!.textContent!;
    expect(resumen).toContain('Presentes 1');
    expect(resumen).toContain('Ausentes 1');
  });

  it('la política cambia el contador de clases a computar', () => {
    const { fixture, el } = mount(ses());
    segmentos(el)[3].click();          // 1 presente, 1 ausente
    fixture.detectChanges();
    expect(el.querySelector('.att-summary')!.textContent).toContain('Clases a computar 2');

    el.querySelector<HTMLInputElement>('.att-policy input')!.click();   // apagar la política
    fixture.detectChanges();
    expect(el.querySelector('.att-summary')!.textContent).toContain('Clases a computar 1');
  });

  it('emite las marcas reconciliadas y la política', () => {
    const { fixture, el, cmp } = mount(ses());
    let emitido: { marks: readonly AttendanceMark[]; discountAbsences: boolean } | undefined;
    cmp.confirmed.subscribe((e) => (emitido = e));

    segmentos(el)[3].click();
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();

    expect(emitido).toEqual({
      marks: [{ memberId: '1-r1', present: true }, { memberId: '1-r2', present: false }],
      discountAbsences: true,
    });
  });

  it('DOS activaciones seguidas del botón emiten UNA sola vez', () => {
    // .btn.loading es sólo pointer-events:none y NO frena el teclado: dos Enter seguidos son
    // dos escrituras en vuelo. El guard tiene que estar en código, no en el CSS.
    const { fixture, el, cmp } = mount(ses());
    let veces = 0;
    cmp.confirmed.subscribe(() => veces++);

    const boton = el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!;
    // SIN detectChanges() entre los dos clicks, a propósito: es el escenario real (dos Enter en el
    // mismo macrotask, antes de que corra la detección de cambios). Con un detectChanges() en el
    // medio el botón queda disabled y jsdom descarta el segundo click ANTES del handler
    // (HTMLElement-impl.js: `if (isDisabled(this)) return`), así que el test pasaría en verde
    // aunque se borrara el guard: estaría probando el [disabled] del template, que es justo el
    // freno que NO alcanza. Así, el guard de confirm() es lo único que evita el segundo emit.
    boton.click();
    boton.click();

    expect(veces).toBe(1);

    fixture.detectChanges();
    expect(boton.disabled).toBe(true);
  });

  it('markFailed rehabilita el botón para reintentar', () => {
    const { fixture, el, cmp } = mount(ses());
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    fixture.detectChanges();
    cmp.markFailed();
    fixture.detectChanges();
    expect(el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.disabled).toBe(false);
  });

  it('reabrir después de un fallo arranca en limpio', () => {
    const { fixture, el, cmp } = mount(ses());
    segmentos(el)[3].click();                 // Bruno ausente
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    fixture.detectChanges();
    cmp.markFailed();
    fixture.detectChanges();

    cmp.open();                                // reabrir
    fixture.detectChanges();
    expect(segmentos(el)[3].classList.contains('on-a')).toBe(false);   // volvió a presente
  });
});
