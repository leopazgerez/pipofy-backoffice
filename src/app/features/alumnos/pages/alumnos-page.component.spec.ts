import { describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AlumnosPageComponent } from './alumnos-page.component';
import { AlumnosFacade } from '../alumnos.facade';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { CategoriesRepository } from '@domain/contracts/categories.repository';
import { Student, StudentDraft } from '@domain/entities/student';

const ALUMNO: Student = {
  id: '1', phone: '1155667788', firstName: 'Ana', lastName: 'Pérez',
  birthDate: '2001-05-03', categoryId: '5', dominantHand: 'zurdo', ranking: 12, notes: null,
};

async function settle(fixture: ComponentFixture<AlumnosPageComponent>): Promise<void> {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

async function mount(over: Partial<StudentsRepository> = {}) {
  const repo = {
    list: async () => [ALUMNO],
    create: async (_d: StudentDraft) => undefined,
    update: async (_id: string, _d: StudentDraft) => undefined,
    remove: async (_id: string) => undefined,
    ...over,
  } as StudentsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      AlumnosFacade,
      { provide: StudentsRepository, useValue: repo },
      {
        provide: CategoriesRepository,
        useValue: { list: async () => [{ id: '5', name: 'Quinta', levelOrder: 5 }] },
      },
    ],
  });
  const fixture = TestBed.createComponent(AlumnosPageComponent);
  fixture.detectChanges();
  await settle(fixture);
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

const filas = (el: HTMLElement) => Array.from(el.querySelectorAll('tbody tr'));
const buscador = (el: HTMLElement) => el.querySelector<HTMLInputElement>('#alumnos-q')!;

describe('AlumnosPageComponent', () => {
  it('renderiza el alumno como "Apellido, Nombre" con su categoría resuelta', async () => {
    const { el } = await mount();
    expect(filas(el)[0].textContent).toContain('Pérez, Ana');
    expect(filas(el)[0].textContent).toContain('Quinta');
  });

  it('un alumno sin nombre se muestra por su teléfono', async () => {
    const { el } = await mount({ list: async () => [{ ...ALUMNO, firstName: '', lastName: '' }] });
    expect(filas(el)[0].textContent).toContain('1155667788');
  });

  it('un alumno sin categoría muestra una raya', async () => {
    const { el } = await mount({ list: async () => [{ ...ALUMNO, categoryId: null }] });
    expect(filas(el)[0].textContent).toContain('—');
  });

  it('el buscador filtra por apellido', async () => {
    const { fixture, el } = await mount({
      list: async () => [ALUMNO, { ...ALUMNO, id: '2', lastName: 'Gómez', firstName: 'Beto' }],
    });
    buscador(el).value = 'gómez';
    buscador(el).dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(filas(el)).toHaveLength(1);
  });

  it('el buscador también filtra por teléfono', async () => {
    // Es el único dato que TODO alumno tiene: el backend sólo exige phone.
    const { fixture, el } = await mount({
      list: async () => [ALUMNO, { ...ALUMNO, id: '2', phone: '1199887766', lastName: 'Gómez' }],
    });
    buscador(el).value = '9988';
    buscador(el).dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(filas(el)).toHaveLength(1);
  });

  it('si la carga FALLA muestra el banner y NO el vacío', async () => {
    const { el } = await mount({ list: () => Promise.reject({ kind: 'forbidden' as const }) });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.querySelector('.a-empty')).toBeNull();
  });

  it('un error de guardado NO reemplaza la tabla y deja el modal abierto', async () => {
    // El teléfono se escribe a propósito: sin él createStudentDraft tira la invariante y el
    // repo nunca se llama, así que el test pasaría probando otra cosa que la que dice.
    const { fixture, el } = await mount({
      create: () => Promise.reject({
        kind: 'domain' as const,
        message: 'Ya existe un alumno con ese teléfono en este club',
      }),
    });
    el.querySelector<HTMLButtonElement>('.panel-head .btn-primary')!.click();
    fixture.detectChanges();
    const tel = el.querySelector<HTMLInputElement>('#alumno-telefono')!;
    tel.value = '1155667788';
    tel.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('[data-test="save"]')!.click();
    await settle(fixture);

    expect(filas(el)).toHaveLength(1);
    expect(el.querySelector('[role="alert"]')!.textContent).toContain('Ya existe un alumno');
    expect(el.querySelector<HTMLDialogElement>('app-alumno-form-modal dialog')!.open).toBe(true);
  });
});
