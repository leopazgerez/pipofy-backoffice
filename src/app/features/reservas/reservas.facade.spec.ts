import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ReservasFacade } from './reservas.facade';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ClassSession } from '@domain/entities/class-session';

const late: ClassSession = {
  id: 'tarde',
  courtId: '1',
  coachId: '1',
  categoryGroupId: '1',
  startAt: '2026-08-19T22:00:00.000Z',
  capacity: 4,
  availableSpots: 0,
};
const early: ClassSession = { ...late, id: 'temprano', startAt: '2026-08-19T18:00:00.000Z' };

function setup(over: Partial<ClassSessionsRepository> = {}) {
  const dates: string[] = [];
  const repo = {
    list: async (dateKey: string) => {
      dates.push(dateKey);
      return [late, early];
    },
    waitingList: async () => [],
    joinWaitingList: async () => undefined,
    leaveWaitingList: async () => undefined,
    ...over,
  } as ClassSessionsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      ReservasFacade,
      { provide: ClassSessionsRepository, useValue: repo },
    ],
  });
  return { facade: TestBed.inject(ReservasFacade), dates };
}

describe('ReservasFacade', () => {
  it('arranca en la fecha de HOY en hora local', () => {
    // Con toISOString() esto se rompe todas las noches después de las 21:00 en Argentina.
    const { facade } = setup();
    const hoy = new Date();
    const esperado = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    expect(facade.date()).toBe(esperado);
  });

  it('load() pide la fecha seleccionada y ordena por hora', () => {
    // El backend no ordena: class-sessions.service.list() no tiene ORDER BY.
    const { facade } = setup();
    return facade.load().then(() => {
      expect(facade.sorted().map((s) => s.id)).toEqual(['temprano', 'tarde']);
    });
  });

  it('setDate() cambia la fecha y recarga', async () => {
    const { facade, dates } = setup();
    await facade.setDate('2026-09-01');
    expect(facade.date()).toBe('2026-09-01');
    expect(dates.at(-1)).toBe('2026-09-01');
  });

  it('un fallo del repo se normaliza y NO rechaza', async () => {
    const { facade } = setup({ list: () => Promise.reject({ kind: 'forbidden' as const }) });
    await facade.load();
    expect(facade.error()).toEqual({ kind: 'forbidden' });
    expect(facade.data()).toBeNull();
  });
});
