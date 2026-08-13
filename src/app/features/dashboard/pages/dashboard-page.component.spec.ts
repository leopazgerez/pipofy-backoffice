import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { DashboardPageComponent } from './dashboard-page.component';
import { DashboardFacade } from '../dashboard.facade';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { ClubRepository } from '@domain/contracts/club.repository';
import { DashboardSnapshot } from '@domain/entities/dashboard-snapshot';

const snapshot: DashboardSnapshot = {
  clubId: 'c1',
  kpis: { sessionsToday: 1, courtsTotal: 1, occupancyPct: 100 },
  grid: {
    courts: [{ name: 'Cancha 1', meta: 'Cemento · Techada' }],
    hours: ['18:00'],
    sessions: [
      [
        {
          id: '10',
          category: '7ma',
          professor: 'Diego A.',
          occupied: 4,
          capacity: 4,
          state: 'full',
        },
      ],
    ],
  },
  waitlist: [{ id: '10', title: '7ma · Cancha 1 · 18:00', meta: '3 en espera · cupo lleno' }],
};

/** Doble simple: getSnapshot resuelve el snapshot fijo de arriba. */
async function mount(repo: DashboardRepository = { getSnapshot: async () => snapshot }) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      DashboardFacade,
      { provide: DashboardRepository, useValue: repo },
      { provide: ClubRepository, useValue: { isActive: async () => true } },
    ],
  });
  const fixture = TestBed.createComponent(DashboardPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await flushRepo();
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

// Un salto de MACROTAREA que deja drenar toda la cola de microtareas. Es obligatorio:
// fixture.whenStable() sólo espera el PendingTasks de Angular (HTTP, router) y cede UN tick
// de microtarea — no espera la cadena load()→run()→setData()→then() de la facade, que no
// está registrada ahí y tiene varias microtareas de profundidad. Sin esto, los asserts
// corren antes de que el dashboard exista.
const flushRepo = () => new Promise((r) => setTimeout(r, 0));

describe('DashboardPageComponent', () => {
  it('renderiza el dashboard con la grilla y el rail', async () => {
    const { el } = await mount();
    expect(el.querySelector('#view-dashboard')).toBeTruthy();
    expect(el.querySelector('app-court-grid')).toBeTruthy();
    expect(el.querySelector('.rail app-waitlist-card')).toBeTruthy();
  });
});
