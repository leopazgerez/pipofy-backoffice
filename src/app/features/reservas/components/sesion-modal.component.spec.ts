import { describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SesionModalComponent } from './sesion-modal.component';
import { SesionFacade } from '../sesion.facade';
import { ReservasFacade } from '../reservas.facade';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ReservationsRepository } from '@domain/contracts/reservations.repository';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { ClassSession } from '@domain/entities/class-session';
import { Student } from '@domain/entities/student';
import { StudentPlan } from '@domain/entities/student-plan';
import { Plan } from '@domain/entities/plan';
import { Reservation } from '@domain/entities/reservation';

const session: ClassSession = {
  id: '10', courtId: '2', coachId: '5', categoryGroupId: '3',
  startAt: '2026-08-19T21:00:00.000Z', capacity: 4, availableSpots: 1,
};

const student: Student = {
  id: '4', phone: '1155667788', firstName: 'Bruno', lastName: 'Torres',
  birthDate: null, categoryId: '3', dominantHand: null, ranking: null, notes: null,
};

const studentPlan: StudentPlan = {
  id: '9', planId: 'p1', purchasedAt: null, creditsTotal: 8, creditsRemaining: 8, expiresAt: null,
};

const plan: Plan = {
  id: 'p1', name: 'Mensual x8', planTypeId: 't1', coachId: null, classCount: 8,
  price: null, validityDays: null, active: true,
};

const HOLD_VIVO = new Date(Date.now() + 30 * 60_000).toISOString();

function mount(over: { reserve?: () => Promise<Reservation> } = {}) {
  const calls: string[] = [];
  const reservations = {
    reserve: over.reserve ?? (async () => {
      calls.push('reserve');
      return { id: '55', holdExpiresAt: HOLD_VIVO };
    }),
    confirm: async () => { calls.push('confirm'); },
    cancel: async () => { calls.push('cancel'); },
  } as ReservationsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      SesionFacade,
      ReservasFacade,
      { provide: ClassSessionsRepository, useValue: {
          list: async () => [session], waitingList: async () => [],
          joinWaitingList: async () => undefined, leaveWaitingList: async () => undefined,
        } as ClassSessionsRepository },
      { provide: ReservationsRepository, useValue: reservations },
      { provide: StudentsRepository, useValue: {
          list: async () => [student], plans: async () => [studentPlan],
          create: async () => undefined, update: async () => undefined, remove: async () => undefined,
        } as StudentsRepository },
      { provide: PlansRepository, useValue: {
          list: async () => [plan],
          create: async () => undefined, update: async () => undefined, remove: async () => undefined,
        } as PlansRepository },
    ],
  });

  const fixture = TestBed.createComponent(SesionModalComponent);
  fixture.componentRef.setInput('students', [student]);
  fixture.componentRef.setInput('labels', () => 'Cancha 2 · 18:00 · 3ra');
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, calls };
}

/**
 * El tick de macrotask NO es de adorno: onStudent() y el catálogo de planes resuelven con
 * cadenas de promesas, y whenStable() solo no siempre las alcanza. Mismo helper que usan
 * reservas-page.component.spec.ts y grupos-categoria-page.component.spec.ts.
 */
async function settle(fixture: ComponentFixture<SesionModalComponent>): Promise<void> {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

/** Abre el modal en la sesión de prueba y deja asentada la carga de la lista de espera. */
async function abrir(fixture: ComponentFixture<SesionModalComponent>): Promise<void> {
  fixture.componentInstance.open(session);
  await settle(fixture);
}

/** Elige el alumno y su plan usable, esperando a que se resuelva GET /students/:id/plans. */
async function elegirAlumnoYPlan(fixture: ComponentFixture<SesionModalComponent>, el: HTMLElement): Promise<void> {
  const alumno = el.querySelector<HTMLSelectElement>('#res-alumno')!;
  alumno.value = student.id;
  alumno.dispatchEvent(new Event('change'));
  fixture.detectChanges();
  await settle(fixture);

  const planSelect = el.querySelector<HTMLSelectElement>('#res-plan')!;
  planSelect.value = studentPlan.id;
  planSelect.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const hit = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto);
  if (!hit) throw new Error(`No se encontró el botón "${texto}"`);
  return hit;
}

describe('SesionModalComponent', () => {
  it('dos clicks seguidos en Reservar producen UNA sola llamada a reservar', async () => {
    // Regresión directa del CRITICAL: class-sessions.service.ts no chequea si el alumno ya
    // tiene una reserva en esta sesión y no hay índice único (classSessionId, studentId), así
    // que dos reservar() en vuelo son dos holds reales del mismo alumno.
    //
    // SIN detectChanges() entre los dos clicks, a propósito: es el escenario real (dos Enter en
    // el mismo macrotask). Con un detectChanges() en el medio el [disabled] ya reflejaría
    // facade.loading() y jsdom descartaría el segundo click ANTES de correr el handler,
    // haciendo pasar el test aunque se borrara el guard en código — que es justo el freno que
    // NO alcanza (ver AttendanceModalComponent, mismo argumento).
    const { fixture, el, calls } = mount();
    await abrir(fixture);
    await elegirAlumnoYPlan(fixture, el);

    const btn = boton(el, 'Reservar');
    btn.click();
    btn.click();

    await settle(fixture);
    expect(calls.filter((c) => c === 'reserve')).toHaveLength(1);
  });

  it('limpia alumno y plan después de un reservar() exitoso', async () => {
    const { fixture, el } = mount();
    await abrir(fixture);
    await elegirAlumnoYPlan(fixture, el);

    boton(el, 'Reservar').click();
    await settle(fixture);

    expect(el.querySelector<HTMLSelectElement>('#res-alumno')!.value).toBe('');
    expect(el.querySelector<HTMLSelectElement>('#res-plan')!.value).toBe('');
  });

  it('el botón Reservar está deshabilitado sin alumno o sin plan', async () => {
    const { fixture, el } = mount();
    await abrir(fixture);

    expect(boton(el, 'Reservar').disabled).toBe(true);

    const alumno = el.querySelector<HTMLSelectElement>('#res-alumno')!;
    alumno.value = student.id;
    alumno.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await settle(fixture);
    expect(boton(el, 'Reservar').disabled).toBe(true); // alumno sí, plan todavía no

    const planSelect = el.querySelector<HTMLSelectElement>('#res-plan')!;
    planSelect.value = studentPlan.id;
    planSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(boton(el, 'Reservar').disabled).toBe(false);
  });

  it('el select de plan muestra el nombre del plan, no sólo los créditos', async () => {
    const { fixture, el } = mount();
    await abrir(fixture);

    const alumno = el.querySelector<HTMLSelectElement>('#res-alumno')!;
    alumno.value = student.id;
    alumno.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await settle(fixture);

    const opcion = el.querySelector<HTMLOptionElement>(`#res-plan option[value="${studentPlan.id}"]`)!;
    expect(opcion.textContent).toContain('Mensual x8');
    expect(opcion.textContent).toContain('8 créditos');
  });

  it('un hold vencido muestra "Venció" y deshabilita Confirmar', async () => {
    const vencido = new Date(Date.now() - 60 * 60_000).toISOString(); // hace 1 hora
    const { fixture, el } = mount({ reserve: async () => ({ id: '55', holdExpiresAt: vencido }) });
    await abrir(fixture);
    await elegirAlumnoYPlan(fixture, el);

    boton(el, 'Reservar').click();
    await settle(fixture);

    expect(el.querySelector('.a-meta')!.textContent).toContain('Venció');
    expect(boton(el, 'Confirmar').disabled).toBe(true);
  });

  it('dos clicks seguidos en Confirmar producen UNA sola llamada a confirm', async () => {
    // El mismo freno que Reservar, pero acá el daño de no tenerlo es menor (409 del backend):
    // igual se prueba en código, no sólo con el [disabled] del template.
    const { fixture, el, calls } = mount();
    await abrir(fixture);
    await elegirAlumnoYPlan(fixture, el);

    boton(el, 'Reservar').click();
    await settle(fixture);

    const btn = boton(el, 'Confirmar');
    btn.click();
    btn.click();

    await settle(fixture);
    expect(calls.filter((c) => c === 'confirm')).toHaveLength(1);
  });
});
