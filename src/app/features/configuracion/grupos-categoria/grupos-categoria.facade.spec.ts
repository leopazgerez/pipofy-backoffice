import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GruposCategoriaFacade } from './grupos-categoria.facade';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { CategoryGroup, CategoryGroupDraft } from '@domain/entities/category-group';

const grupo: CategoryGroup = { id: '1', name: 'Principiantes' };
const input = { name: 'Principiantes' };

function setup(over: Partial<CategoryGroupsRepository> = {}) {
  const calls: string[] = [];
  const repo = {
    list: async () => { calls.push('list'); return [grupo]; },
    create: async (_d: CategoryGroupDraft) => { calls.push('create'); },
    update: async (_id: string, _d: CategoryGroupDraft) => { calls.push('update'); },
    remove: async (_id: string) => { calls.push('remove'); },
    ...over,
  } as CategoryGroupsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      GruposCategoriaFacade,
      { provide: CategoryGroupsRepository, useValue: repo },
    ],
  });
  return { facade: TestBed.inject(GruposCategoriaFacade), calls };
}

describe('GruposCategoriaFacade', () => {
  it('load() puebla data()', async () => {
    const { facade } = setup();
    await facade.load();
    expect(facade.data()).toEqual([grupo]);
    expect(facade.error()).toBeNull();
    expect(facade.loading()).toBe(false);
  });

  it('create() escribe y después re-lee la lista', async () => {
    const { facade, calls } = setup();
    await facade.create(input);
    expect(calls).toEqual(['create', 'list']);
  });

  it('update() escribe y después re-lee la lista', async () => {
    const { facade, calls } = setup();
    await facade.update('1', input);
    expect(calls).toEqual(['update', 'list']);
  });

  it('remove() borra y después re-lee la lista', async () => {
    const { facade, calls } = setup();
    await facade.remove('1');
    expect(calls).toEqual(['remove', 'list']);
  });

  it('create() con nombre vacío deja error de dominio y NO llama al repo', async () => {
    // La invariante corre antes de salir a la red: el backend aceptaría el grupo sin nombre.
    const { facade, calls } = setup();
    await facade.create({ name: '   ' });
    expect(calls).toEqual([]);
    expect(facade.error()).toEqual({ kind: 'domain', message: 'El nombre del grupo es obligatorio.' });
  });

  it('un fallo del repo se normaliza a DomainError y NO rechaza', async () => {
    // run() atrapa todo: la página lee error(), no un catch.
    const { facade } = setup({ list: () => Promise.reject({ kind: 'forbidden' as const }) });
    await facade.load();
    expect(facade.error()).toEqual({ kind: 'forbidden' });
  });

  it('un error de escritura NO borra la lista que ya estaba', async () => {
    // La tabla tiene que seguir viéndose mientras el modal muestra el error.
    const { facade } = setup();
    await facade.load();
    const repo = TestBed.inject(CategoryGroupsRepository);
    (repo as { create: unknown }).create = () => Promise.reject({ kind: 'network' as const });
    await facade.create(input);
    expect(facade.error()).toEqual({ kind: 'network' });
    expect(facade.data()).toEqual([grupo]);
  });

  it('clearError() limpia el error sin tocar los datos', async () => {
    const { facade } = setup({ list: () => Promise.reject({ kind: 'network' as const }) });
    await facade.load();
    facade.clearError();
    expect(facade.error()).toBeNull();
  });

  it('sorted() ordena por nombre porque el backend no ordena', async () => {
    const desordenados: CategoryGroup[] = [
      { id: '3', name: 'Intermedios' },
      { id: '1', name: 'Avanzados' },
      { id: '2', name: 'Principiantes' },
    ];
    const { facade } = setup({ list: async () => desordenados });
    await facade.load();
    expect(facade.sorted().map((g) => g.name)).toEqual(['Avanzados', 'Intermedios', 'Principiantes']);
  });

  it('sorted() sin datos devuelve una lista vacía, no null', () => {
    const { facade } = setup();
    expect(facade.sorted()).toEqual([]);
  });
});
