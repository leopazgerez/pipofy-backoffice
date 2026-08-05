import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CanchasFacade } from './canchas.facade';
import { CourtsRepository } from '@domain/contracts/courts.repository';
import { Court, CourtDraft } from '@domain/entities/court';

const court: Court = {
  id: '1', name: 'Cancha 1', code: 'C1', surfaceTypeId: '3', indoor: true, courtStatusId: '1',
};
const input = { name: 'Cancha 1', code: 'C1', surfaceTypeId: '3', indoor: true, courtStatusId: '1' };

function setup(over: Partial<CourtsRepository> = {}) {
  const calls: string[] = [];
  const repo = {
    list: async () => { calls.push('list'); return [court]; },
    create: async (_d: CourtDraft) => { calls.push('create'); },
    update: async (_id: string, _d: CourtDraft) => { calls.push('update'); },
    remove: async (_id: string) => { calls.push('remove'); },
    ...over,
  } as CourtsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      CanchasFacade,
      { provide: CourtsRepository, useValue: repo },
    ],
  });
  return { facade: TestBed.inject(CanchasFacade), calls };
}

describe('CanchasFacade', () => {
  it('load() puebla data()', async () => {
    const { facade } = setup();
    await facade.load();
    expect(facade.data()).toEqual([court]);
    expect(facade.error()).toBeNull();
    expect(facade.loading()).toBe(false);
  });

  it('create() escribe y después re-lee la lista', async () => {
    const { facade, calls } = setup();
    await facade.create(input);
    expect(calls).toEqual(['create', 'list']);
    expect(facade.data()).toEqual([court]);
  });

  it('create() con nombre vacío deja error de dominio y NO llama al repo', async () => {
    // La invariante corre antes de salir a la red: el backend aceptaría el {} feliz (§4.6).
    const { facade, calls } = setup();
    await facade.create({ ...input, name: '   ' });
    expect(calls).toEqual([]);
    expect(facade.error()).toEqual({ kind: 'domain', message: 'El nombre de la cancha es obligatorio.' });
  });

  it('un fallo del repo se normaliza a DomainError y NO rechaza', async () => {
    // run() atrapa todo: la página lee error(), no un catch.
    const { facade } = setup({ list: () => Promise.reject({ kind: 'forbidden' as const }) });
    await facade.load();
    expect(facade.error()).toEqual({ kind: 'forbidden' });
    expect(facade.data()).toBeNull();
  });

  it('clearError() limpia el error sin tocar los datos', async () => {
    // La página lo llama al abrir el modal: si no, un error viejo del load() se mostraría
    // adentro de un alta recién abierta.
    const { facade } = setup();
    await facade.create({ ...input, name: '' });
    expect(facade.error()).not.toBeNull();

    facade.clearError();
    expect(facade.error()).toBeNull();
  });

  it('update() y remove() también re-leen', async () => {
    const { facade, calls } = setup();
    await facade.update('1', input);
    await facade.remove('1');
    expect(calls).toEqual(['update', 'list', 'remove', 'list']);
  });
});

describe('CanchasFacade.sorted', () => {
  it('ordena por nombre porque el backend no ordena', async () => {
    // courts.service.list() no tiene ORDER BY: Postgres devuelve el orden físico del heap
    // y un UPDATE mueve la fila, así que editar una cancha la mandaba al final de la tabla.
    const desordenadas: Court[] = [
      { id: '3', name: 'Cancha 3', code: null, surfaceTypeId: null, indoor: false, courtStatusId: null },
      { id: '1', name: 'Cancha 1', code: null, surfaceTypeId: null, indoor: false, courtStatusId: null },
      { id: '2', name: 'Cancha 2', code: null, surfaceTypeId: null, indoor: false, courtStatusId: null },
    ];
    const { facade } = setup({ list: async () => desordenadas });
    await facade.load();
    expect(facade.sorted().map((c) => c.id)).toEqual(['1', '2', '3']);
  });

  it('sin datos devuelve una lista vacía, no null', () => {
    const { facade } = setup();
    expect(facade.sorted()).toEqual([]);
  });
});
