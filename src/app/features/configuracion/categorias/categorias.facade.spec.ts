import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoriasFacade } from './categorias.facade';
import { CategoriesRepository } from '@domain/contracts/categories.repository';
import { Category, CategoryDraft } from '@domain/entities/category';

const input = { name: '4ta', levelOrder: '4' };

function setup(rows: Category[] = [{ id: '1', name: '4ta', levelOrder: 4 }], over: Partial<CategoriesRepository> = {}) {
  const calls: string[] = [];
  const repo = {
    list: async () => { calls.push('list'); return rows; },
    create: async (_d: CategoryDraft) => { calls.push('create'); },
    update: async (_id: string, _d: CategoryDraft) => { calls.push('update'); },
    remove: async (_id: string) => { calls.push('remove'); },
    ...over,
  } as CategoriesRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      CategoriasFacade,
      { provide: CategoriesRepository, useValue: repo },
    ],
  });
  return { facade: TestBed.inject(CategoriasFacade), calls };
}

describe('CategoriasFacade', () => {
  it('load() puebla data()', async () => {
    const { facade } = setup();
    await facade.load();
    expect(facade.data()).toHaveLength(1);
    expect(facade.error()).toBeNull();
  });

  it('create() escribe y después re-lee la lista', async () => {
    const { facade, calls } = setup();
    await facade.create(input);
    expect(calls).toEqual(['create', 'list']);
  });

  it('create() con nombre vacío deja error de dominio y NO llama al repo', async () => {
    const { facade, calls } = setup();
    await facade.create({ ...input, name: '  ' });
    expect(calls).toEqual([]);
    expect(facade.error()).toEqual({ kind: 'domain', message: 'El nombre de la categoría es obligatorio.' });
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

  it('sorted() ordena por levelOrder y manda las de orden null AL FINAL', async () => {
    // Un `null → 0` las pondría primeras, que es justo al revés: son las que el club
    // todavía no jerarquizó.
    const { facade } = setup([
      { id: '1', name: 'Zeta', levelOrder: null },
      { id: '2', name: '5ta', levelOrder: 5 },
      { id: '3', name: 'Alfa', levelOrder: null },
      { id: '4', name: 'Primera', levelOrder: 0 },
    ]);
    await facade.load();
    expect(facade.sorted().map((c) => c.name)).toEqual(['Primera', '5ta', 'Alfa', 'Zeta']);
  });

  it('sorted() es un array vacío antes de cargar', () => {
    expect(setup().facade.sorted()).toEqual([]);
  });
});
