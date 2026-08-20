import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GrupoItemsModalComponent } from './grupo-items-modal.component';
import { GrupoItemsFacade } from './grupo-items.facade';
import { GrupoItemsStore } from './grupo-items-store';
import { CategoryGroupsRepository } from '@domain/contracts/category-groups.repository';
import { Category } from '@domain/entities/category';
import { CategoryGroup } from '@domain/entities/category-group';

const CATEGORIAS: Category[] = [
  { id: '1', name: 'Cuarta', levelOrder: 4 },
  { id: '2', name: 'Quinta', levelOrder: 5 },
];

const GRUPO: CategoryGroup = { id: '7', name: 'Intermedios' };

/** `seed` precarga la pista del navegador para GRUPO ANTES de open(), igual que
 *  el setup() de grupo-items.facade.spec.ts. */
function setup(over: Partial<CategoryGroupsRepository> = {}, seed: readonly string[] = []) {
  const calls: string[] = [];
  const repo = {
    addItem: async (_g: string, c: string) => { calls.push(`add:${c}`); },
    removeItem: async (_g: string, c: string) => { calls.push(`remove:${c}`); },
    ...over,
  } as CategoryGroupsRepository;

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      GrupoItemsFacade,
      GrupoItemsStore,
      { provide: CategoryGroupsRepository, useValue: repo },
    ],
  });
  const fixture = TestBed.createComponent(GrupoItemsModalComponent);
  fixture.componentRef.setInput('categories', CATEGORIAS);
  fixture.detectChanges();
  TestBed.inject(GrupoItemsStore).write(GRUPO.id, seed);
  fixture.componentInstance.open(GRUPO);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, calls };
}

async function settle(fixture: { whenStable: () => Promise<unknown>; detectChanges: () => void }) {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
}

describe('GrupoItemsModalComponent', () => {
  beforeEach(() => localStorage.clear());

  it('abierto con dos categorías, renderiza un checkbox por categoría', () => {
    const { el } = setup();
    expect(el.querySelectorAll('input[type=checkbox]')).toHaveLength(2);
  });

  it('el checkbox NO está dentro de un .field: usa el primitivo .checkbox-row', () => {
    // .field input es un selector de descendencia (styles/components.css:83-89): sin sacar el
    // checkbox de ahí, hereda width:100%/min-height:48px y se ve como una caja de texto.
    const { el } = setup();
    const checkbox = el.querySelector('input[type=checkbox]')!;
    expect(checkbox.closest('.field')).toBeNull();
    expect(checkbox.closest('.checkbox-row')).not.toBeNull();
  });

  it('una categoría que está en la pista aparece tildada', () => {
    const { el } = setup({}, ['2']);
    expect(el.querySelector<HTMLInputElement>('#cat-2')!.checked).toBe(true);
    expect(el.querySelector<HTMLInputElement>('#cat-1')!.checked).toBe(false);
  });

  it('tildar una categoría llama a addItem con ese id', async () => {
    const { fixture, el, calls } = setup();
    const checkbox = el.querySelector<HTMLInputElement>('#cat-1')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await settle(fixture);
    expect(calls).toEqual(['add:1']);
  });
});
