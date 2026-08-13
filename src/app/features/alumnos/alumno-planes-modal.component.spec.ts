import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AlumnoPlanesModalComponent } from './alumno-planes-modal.component';
import { AlumnoPlanesFacade } from './alumno-planes.facade';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { StudentPlan } from '@domain/entities/student-plan';
import { Student } from '@domain/entities/student';
import { Plan } from '@domain/entities/plan';

const ALUMNO: Student = {
  id: '7', phone: '1155667788', firstName: 'Ana', lastName: 'Pérez',
  birthDate: null, categoryId: null, dominantHand: null, ranking: null, notes: null,
};

const PLANES = [{ id: '10', name: 'Mensual 8 clases' } as Plan];

const sp = (over: Partial<StudentPlan> = {}): StudentPlan => ({
  id: '1', planId: '10', purchasedAt: '2026-08-01',
  creditsTotal: 8, creditsRemaining: 5, expiresAt: '2099-01-01', ...over,
});

async function setup(plans: () => Promise<StudentPlan[]>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      AlumnoPlanesFacade,
      { provide: StudentsRepository, useValue: { plans } },
      { provide: PlansRepository, useValue: { list: async () => PLANES } },
    ],
  });
  const fixture = TestBed.createComponent(AlumnoPlanesModalComponent);
  fixture.detectChanges();
  await fixture.componentInstance.open(ALUMNO);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('AlumnoPlanesModalComponent', () => {
  it('lista los planes con nombre, créditos y vencimiento', async () => {
    const root = await setup(async () => [sp()]);
    const fila = root.querySelector('tbody tr')!;
    expect(fila.textContent).toContain('Mensual 8 clases');
    expect(fila.textContent).toContain('5');
    expect(fila.textContent).toContain('2099-01-01');
  });

  it('muestra los créditos utilizables en el encabezado', async () => {
    const root = await setup(async () => [sp({ id: '1', creditsRemaining: 5 }), sp({ id: '2', creditsRemaining: 2 })]);
    expect(root.querySelector('[data-test="creditos-totales"]')!.textContent).toContain('7');
  });

  // Un plan vencido con créditos se lee como crédito disponible y no lo es: sin la marca,
  // la pantalla miente sobre lo que el alumno puede usar.
  it('marca los planes vencidos', async () => {
    const root = await setup(async () => [sp({ expiresAt: '2020-01-01' })]);
    expect(root.querySelector('tbody tr')!.textContent).toContain('Vencido');
    expect(root.querySelector('[data-test="creditos-totales"]')!.textContent).toContain('0');
  });

  it('un alumno sin planes muestra el estado vacío, no una tabla en blanco', async () => {
    const root = await setup(async () => []);
    expect(root.querySelector('tbody')).toBeNull();
    expect(root.textContent).toContain('todavía no compró ningún plan');
  });

  it('si falla la carga muestra el error', async () => {
    const root = await setup(() => Promise.reject({ kind: 'network' as const }));
    expect(root.querySelector('[role="alert"]')!.textContent).toContain('No pudimos conectar');
  });

  it('un plan sin vencimiento no se muestra como vencido', async () => {
    const root = await setup(async () => [sp({ expiresAt: null })]);
    const fila = root.querySelector('tbody tr')!;
    expect(fila.textContent).not.toContain('Vencido');
    expect(fila.textContent).toContain('No vence');
  });
});
