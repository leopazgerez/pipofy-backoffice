import { describe, it, expect } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ReservasPageComponent } from './reservas-page.component';
import { ReservasFacade } from '../reservas.facade';
import { SesionFacade } from '../sesion.facade';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ReservationsRepository } from '@domain/contracts/reservations.repository';
import { StudentsRepository } from '@domain/contracts/students.repository';
import { PlansRepository } from '@domain/contracts/plans.repository';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { ClassSession } from '@domain/entities/class-session';

const session: ClassSession = {
  id: '10', courtId: '2', coachId: '5', categoryGroupId: '3',
  startAt: '2026-08-19T21:00:00.000Z', capacity: 4, availableSpots: 1,
};

function setup(over: Partial<ClassSessionsRepository> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      ReservasFacade,
      SesionFacade,
      { provide: ClassSessionsRepository, useValue: {
          list: async () => [session], waitingList: async () => [],
          joinWaitingList: async () => undefined, leaveWaitingList: async () => undefined,
          ...over,
        } as ClassSessionsRepository },
      { provide: ReservationsRepository, useValue: {
          reserve: async () => ({ id: '55', holdExpiresAt: null }),
          confirm: async () => undefined, cancel: async () => undefined,
        } as ReservationsRepository },
      { provide: StudentsRepository, useValue: {
          list: async () => [], plans: async () => [],
          create: async () => undefined, update: async () => undefined, remove: async () => undefined,
        } as StudentsRepository },
      // El modal de sesión (siempre presente en el DOM, cerrado) inyecta PlansRepository para
      // resolver el nombre del plan en su select.
      { provide: PlansRepository, useValue: {
          list: async () => [],
          create: async () => undefined, update: async () => undefined, remove: async () => undefined,
        } as PlansRepository },
      { provide: CourtsRepository, useValue: {
          list: async () => [{ id: '2', name: 'Cancha 2', code: null, surfaceTypeId: null, indoor: false, courtStatusId: null }],
          create: async () => undefined, update: async () => undefined, remove: async () => undefined,
        } as CourtsRepository },
      { provide: CoachesRepository, useValue: {
          list: async () => [], update: async () => undefined,
        } as CoachesRepository },
      { provide: CategoryGroupsRepository, useValue: {
          list: async () => [], create: async () => undefined, update: async () => undefined,
          remove: async () => undefined, addItem: async () => undefined, removeItem: async () => undefined,
        } as CategoryGroupsRepository },
    ],
  });
  const fixture = TestBed.createComponent(ReservasPageComponent);
  fixture.detectChanges();
  return fixture;
}

/**
 * El tick de macrotask NO es de adorno: la página resuelve los nombres de cancha, profesor y
 * grupo con cadenas de promesas (`repo.list().then(...)`), y `whenStable()` solo no siempre
 * las alcanza. Es el mismo helper que usa grupos-categoria-page.component.spec.ts.
 */
async function settle(fixture: ComponentFixture<ReservasPageComponent>): Promise<void> {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

describe('ReservasPageComponent', () => {
  it('muestra la clase con su hora LOCAL y su cupo', async () => {
    // test-setup.ts fija TZ=America/Argentina/Buenos_Aires: 21:00Z es 18:00 local.
    const fixture = setup();
    await settle(fixture);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('18:00');
    expect(text).toContain('3/4');
    expect(text).toContain('Cancha 2');
  });

  it('el input de fecha arranca en la fecha de la facade', async () => {
    const fixture = setup();
    await settle(fixture);
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('#reservas-fecha');
    expect(input?.value).toBe(TestBed.inject(ReservasFacade).date());
  });

  it('si la carga del día FALLA muestra el banner y NO la tabla ni el vacío', async () => {
    // Escopado a .panel: el modal de sesión trae sus propios [role="alert"] y .a-empty
    // (dos: "Ninguna reserva pendiente…" y "Sin lista de espera."), siempre en el DOM aunque
    // el <dialog> esté cerrado (Angular no lo desmonta). Mismo precedente que
    // alumnos-page.component.spec.ts / grupos-categoria-page.component.spec.ts.
    const fixture = setup({ list: () => Promise.reject({ kind: 'forbidden' as const }) });
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.panel [role="alert"]')).not.toBeNull();
    expect(el.querySelector('.panel table')).toBeNull();
    expect(el.querySelector('.panel .a-empty')).toBeNull();
  });

  it('una lista vacía muestra el vacío de "no hay clases generadas"', async () => {
    // Mitad 1 de la invariante que el propio HTML documenta: el vacío sólo cuando la lista
    // LLEGÓ vacía.
    const fixture = setup({ list: async () => [] });
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.panel .a-empty')!.textContent).toContain('No hay clases generadas');
    expect(el.querySelector('.panel [role="alert"]')).toBeNull();
  });

  it('si la carga FALLA no muestra el vacío: data() es null, no []', async () => {
    // Mitad 2: con data() en null la carga falló y corresponde el banner de arriba, no "no hay
    // clases generadas" — decir eso sería mentir.
    const fixture = setup({ list: () => Promise.reject({ kind: 'network' as const }) });
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.panel .a-empty')).toBeNull();
    expect(el.querySelector('.panel [role="alert"]')).not.toBeNull();
  });

  it('cambiar la fecha del input dispara setDate() con el nuevo valor', async () => {
    const fixture = setup();
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#reservas-fecha')!;

    input.value = '2026-09-01';
    input.dispatchEvent(new Event('change'));
    await settle(fixture);

    expect(TestBed.inject(ReservasFacade).date()).toBe('2026-09-01');
  });
});
