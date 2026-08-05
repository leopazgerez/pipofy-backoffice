import { describe, it, expect } from 'vitest';
import { createCoachDraft } from './coach';

describe('createCoachDraft', () => {
  it('recorta los espacios', () => {
    expect(createCoachDraft({ description: '  Especialista en revés  ' }))
      .toEqual({ description: 'Especialista en revés' });
  });

  it('vacío se vuelve null: es la única forma de vaciar la columna (§3.10)', () => {
    expect(createCoachDraft({ description: '' }).description).toBeNull();
    expect(createCoachDraft({ description: '   ' }).description).toBeNull();
  });
});
