import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { of, throwError, Observable } from 'rxjs';
import { HttpDashboardRepository } from './http-dashboard.repository';
import { CatalogsRepository } from './catalogs.repository';
import { ApiClient } from '../http/api-client';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';

const court = {
  id: '1',
  name: 'Cancha 1',
  code: null,
  surfaceTypeId: null,
  indoor: true,
  courtStatusId: null,
};
const sessionRow = (over: Record<string, unknown> = {}) => ({
  id: '10',
  courtId: '1',
  coachId: '2',
  categoryGroupId: '3',
  startAt: new Date().toISOString(),
  capacity: 4,
  availableSpots: 1,
  ...over,
});

function setup(byPath: Record<string, Observable<unknown>> = {}) {
  const paths: string[] = [];
  const api = {
    get: (path: string) => {
      paths.push(path);
      const match = Object.keys(byPath).find((k) => path.startsWith(k));
      return match ? byPath[match] : of([]);
    },
  } as unknown as ApiClient;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      HttpDashboardRepository,
      { provide: ApiClient, useValue: api },
      { provide: CourtsRepository, useValue: { list: async () => [court] } },
      {
        provide: CoachesRepository,
        useValue: { list: async () => [{ id: '2', displayName: 'Diego A.', description: null }] },
      },
      {
        provide: CategoryGroupsRepository,
        useValue: { list: async () => [{ id: '3', name: '7ma' }] },
      },
      { provide: CatalogsRepository, useValue: { surfaceTypes: async () => [] } },
    ],
  });
  return { repo: TestBed.inject(HttpDashboardRepository), paths };
}

describe('HttpDashboardRepository.getSnapshot', () => {
  it('pide una ventana de ±1 día alrededor de hoy', async () => {
    // El backend interpreta from/to como UTC literal (§3.2): pedir sólo "hoy" pierde las
    // clases de 21:00 a 23:59 hora local. El recorte fino lo hace el mapper.
    const { repo, paths } = setup();
    await repo.getSnapshot('c1');
    const url = paths.find((p) => p.startsWith('/class-sessions?'));
    expect(url).toBeDefined();

    const params = new URLSearchParams(url!.split('?')[1]);
    const from = new Date(`${params.get('from')}T12:00:00`);
    const to = new Date(`${params.get('to')}T12:00:00`);
    expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(2);
  });

  it('sólo consulta la lista de espera de las sesiones llenas', async () => {
    const { repo, paths } = setup({
      '/class-sessions?': of([
        sessionRow({ id: '10', availableSpots: 0 }),
        sessionRow({ id: '11', availableSpots: 2 }),
      ]),
    });
    await repo.getSnapshot('c1');
    const waiting = paths.filter((p) => p.includes('/waiting-list'));
    expect(waiting).toEqual(['/class-sessions/10/waiting-list']);
  });

  it('sólo consulta la lista de espera de las sesiones llenas DE HOY, no de ayer', async () => {
    // fetchSessions pide ±1 día (el backend interpreta from/to como UTC literal), así que
    // `sessions` trae ayer, hoy y mañana. Sin el filtro de fecha local, una sesión llena de
    // ayer también dispara un request de lista de espera que se descarta en el mapper.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { repo, paths } = setup({
      '/class-sessions?': of([
        sessionRow({ id: '10', availableSpots: 0 }), // hoy (sessionRow por defecto)
        sessionRow({ id: '11', availableSpots: 0, startAt: yesterday.toISOString() }),
      ]),
    });
    await repo.getSnapshot('c1');
    const waiting = paths.filter((p) => p.includes('/waiting-list'));
    expect(waiting).toEqual(['/class-sessions/10/waiting-list']);
  });

  it('si falla la lista de espera, la sesión queda full y el snapshot sobrevive', async () => {
    // La lista de espera es información secundaria; la grilla es la pantalla.
    const { repo } = setup({
      '/class-sessions?': of([sessionRow({ availableSpots: 0 })]),
      '/class-sessions/10/waiting-list': throwError(() => new Error('boom')),
    });
    const snap = await repo.getSnapshot('c1');
    expect(snap.grid.sessions[0][0]?.state).toBe('full');
  });

  it('normaliza a DomainError si el payload de sesiones deriva', async () => {
    const { repo } = setup({ '/class-sessions?': of([sessionRow({ id: 10 })]) });
    await expect(repo.getSnapshot('c1')).rejects.toMatchObject({ kind: 'validation' });
  });

  it('propaga el clubId recibido sin mandarlo en la URL', async () => {
    // Todos los endpoints resuelven el club del JWT; el clubId sólo puebla el snapshot.
    const { repo, paths } = setup();
    const snap = await repo.getSnapshot('c1');
    expect(snap.clubId).toBe('c1');
    expect(paths.some((p) => p.includes('c1'))).toBe(false);
  });
});
