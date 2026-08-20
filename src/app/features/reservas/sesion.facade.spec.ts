import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SesionFacade } from './sesion.facade';
import { ReservasFacade } from './reservas.facade';
import { ClassSessionsRepository } from '@domain/contracts/class-sessions.repository';
import { ReservationsRepository } from '@domain/contracts/reservations.repository';
import { WaitingListEntry } from '@domain/entities/waiting-list';

const entry: WaitingListEntry = { id: '77', studentId: '4', requestedAt: null };
const input = { sessionId: '10', studentId: '4', studentPlanId: '9' };

function setup(over: Partial<ReservationsRepository> = {}) {
  const calls: string[] = [];
  const sessions = {
    list: async () => {
      calls.push('sessions.list');
      return [];
    },
    waitingList: async () => {
      calls.push('waitingList');
      return [entry];
    },
    joinWaitingList: async () => {
      calls.push('join');
    },
    leaveWaitingList: async () => {
      calls.push('leave');
    },
  } as ClassSessionsRepository;

  const reservations = {
    reserve: async () => {
      calls.push('reserve');
      return { id: '55', holdExpiresAt: null };
    },
    confirm: async () => {
      calls.push('confirm');
    },
    cancel: async () => {
      calls.push('cancel');
    },
    ...over,
  } as ReservationsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      SesionFacade,
      ReservasFacade,
      { provide: ClassSessionsRepository, useValue: sessions },
      { provide: ReservationsRepository, useValue: reservations },
    ],
  });
  return { facade: TestBed.inject(SesionFacade), calls };
}

describe('SesionFacade', () => {
  it('open() carga la lista de espera', async () => {
    const { facade } = setup();
    await facade.open('10');
    expect(facade.data()).toEqual([entry]);
  });

  it('reservar() deja el hold en pendientes y refresca las sesiones', async () => {
    const { facade, calls } = setup();
    await facade.reservar('10', input);
    expect(facade.holdsOf('10')).toEqual([
      { reservation: { id: '55', holdExpiresAt: null }, studentId: '4' },
    ]);
    expect(calls).toEqual(['reserve', 'sessions.list']);
  });

  it('reservar() sin plan NO llama al repo y deja el error de dominio', async () => {
    const { facade, calls } = setup();
    await facade.reservar('10', { ...input, studentPlanId: '' });
    expect(calls).toEqual([]);
    expect(facade.error()).toEqual({
      kind: 'domain',
      message: 'Elegí un plan con créditos: sin plan la reserva no se puede confirmar.',
    });
  });

  it('confirmar() saca el hold de pendientes', async () => {
    const { facade } = setup();
    await facade.reservar('10', input);
    await facade.confirmar('10', '55');
    expect(facade.holdsOf('10')).toEqual([]);
  });

  it('cancelar() refresca las sesiones Y la lista de espera', async () => {
    // El backend promueve al primero de la lista creando un hold nuevo: la lista se acortó
    // sola aunque el usuario no haya tocado ese bloque. Sin este refresco, muestra a alguien
    // que ya no está esperando.
    const { facade, calls } = setup();
    await facade.reservar('10', input);
    calls.length = 0;
    await facade.cancelar('10', '55');
    expect(calls).toEqual(['cancel', 'sessions.list', 'waitingList']);
    expect(facade.holdsOf('10')).toEqual([]);
  });

  it('anotar() y quitar() releen la lista de espera', async () => {
    const { facade, calls } = setup();
    await facade.anotar('10', '4');
    expect(calls).toEqual(['join', 'waitingList']);
    calls.length = 0;
    await facade.quitar('10', '77');
    expect(calls).toEqual(['leave', 'waitingList']);
  });

  it('los holds son por sesión: los de una no aparecen en la otra', async () => {
    const { facade } = setup();
    await facade.reservar('10', input);
    expect(facade.holdsOf('11')).toEqual([]);
  });

  it('un fallo al confirmar deja el error y NO rechaza', async () => {
    const { facade } = setup({
      confirm: () => Promise.reject({ kind: 'domain' as const, message: 'El hold expiró' }),
    });
    await facade.confirmar('10', '55');
    expect(facade.error()).toEqual({ kind: 'domain', message: 'El hold expiró' });
  });
});
