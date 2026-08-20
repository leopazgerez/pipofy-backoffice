import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GrupoItemsFacade } from './grupo-items.facade';
import { GrupoItemsStore } from './grupo-items-store';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';

function setup(over: Partial<CategoryGroupsRepository> = {}) {
  const calls: string[] = [];
  const repo = {
    addItem: async (_g: string, c: string) => { calls.push(`add:${c}`); },
    removeItem: async (_g: string, c: string) => { calls.push(`remove:${c}`); },
    ...over,
  } as CategoryGroupsRepository;

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      GrupoItemsFacade,
      GrupoItemsStore,
      { provide: CategoryGroupsRepository, useValue: repo },
    ],
  });
  return { facade: TestBed.inject(GrupoItemsFacade), calls };
}

describe('GrupoItemsFacade', () => {
  beforeEach(() => localStorage.clear());

  it('open() siembra la selección con la pista guardada', () => {
    const { facade } = setup();
    TestBed.inject(GrupoItemsStore).write('7', ['1', '3']);
    facade.open('7');
    expect(facade.selected()).toEqual(['1', '3']);
  });

  it('tildar agrega, persiste la pista y no deja error', async () => {
    const { facade, calls } = setup();
    facade.open('7');
    await facade.toggle('3', true);
    expect(calls).toEqual(['add:3']);
    expect(facade.selected()).toEqual(['3']);
    expect(TestBed.inject(GrupoItemsStore).read('7')).toEqual(['3']);
    expect(facade.error()).toBeNull();
  });

  it('destildar quita y persiste', async () => {
    const { facade, calls } = setup();
    TestBed.inject(GrupoItemsStore).write('7', ['1', '3']);
    facade.open('7');
    await facade.toggle('1', false);
    expect(calls).toEqual(['remove:1']);
    expect(facade.selected()).toEqual(['3']);
    expect(TestBed.inject(GrupoItemsStore).read('7')).toEqual(['3']);
  });

  it('si la escritura falla, la selección VUELVE atrás y queda el error', async () => {
    // Sin el rollback la checkbox mentiría con una categoría que la API rechazó.
    const { facade } = setup({
      addItem: () => Promise.reject({ kind: 'forbidden' as const }),
    });
    facade.open('7');
    await facade.toggle('3', true);
    expect(facade.selected()).toEqual([]);
    expect(facade.error()).toEqual({ kind: 'forbidden' });
    expect(TestBed.inject(GrupoItemsStore).read('7')).toEqual([]);
  });
});
