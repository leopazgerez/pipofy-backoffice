import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProfesoresFacade } from './profesores.facade';
import { CoachesRepository } from '@domain/contracts/coaches.repository';
import { Coach, CoachDraft } from '@domain/entities/coach';

const COACHES: Coach[] = [
  { id: '2', displayName: 'Zulema Paz', description: null },
  { id: '1', displayName: 'Ana Díaz', description: 'Revés a una mano' },
];

function setup(repo: Partial<CoachesRepository>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: CoachesRepository, useValue: repo },
      ProfesoresFacade,
    ],
  });
  return TestBed.inject(ProfesoresFacade);
}

describe('ProfesoresFacade', () => {
  it('load() deja la lista en data()', async () => {
    const f = setup({ list: async () => COACHES });
    await f.load();
    expect(f.data()).toHaveLength(2);
  });

  it('sorted() ordena por displayName: el backend no ordena', async () => {
    const f = setup({ list: async () => COACHES });
    await f.load();
    expect(f.sorted().map((c) => c.displayName)).toEqual(['Ana Díaz', 'Zulema Paz']);
  });

  it('sorted() con data() en null devuelve lista vacía, no rompe', () => {
    expect(setup({ list: async () => COACHES }).sorted()).toEqual([]);
  });

  it('save() manda el draft y RELEE', async () => {
    const enviados: { id: string; draft: CoachDraft }[] = [];
    let leidas = 0;
    const f = setup({
      update: async (id, draft) => { enviados.push({ id, draft }); },
      list: async () => { leidas++; return COACHES; },
    });
    await f.save('1', { description: '  Revés a dos manos  ' });
    expect(enviados).toEqual([{ id: '1', draft: { description: 'Revés a dos manos' } }]);
    expect(leidas).toBe(1);
  });

  it('save() con descripción vacía manda null', async () => {
    const enviados: CoachDraft[] = [];
    const f = setup({ update: async (_id, d) => { enviados.push(d); }, list: async () => COACHES });
    await f.save('1', { description: '   ' });
    expect(enviados[0].description).toBeNull();
  });

  it('save() que falla deja el error normalizado', async () => {
    const f = setup({ update: async () => { throw { kind: 'not-found' }; }, list: async () => COACHES });
    await f.save('9', { description: 'x' });
    expect(f.error()).toEqual({ kind: 'not-found' });
  });

  it('clearError() limpia', async () => {
    const f = setup({ list: async () => { throw { kind: 'network' }; } });
    await f.load();
    f.clearError();
    expect(f.error()).toBeNull();
  });
});
