import { describe, it, expect } from 'vitest';
import { createCategoryGroupDraft } from './category-group';
import { InvalidCategoryGroupError } from '../errors';

describe('createCategoryGroupDraft', () => {
  it('recorta el nombre', () => {
    expect(createCategoryGroupDraft({ name: '  Principiantes  ' })).toEqual({ name: 'Principiantes' });
  });

  it('exige nombre aunque el backend acepte null', () => {
    // Un grupo sin nombre es inelegible en el select de Horarios: no habría qué mostrar.
    expect(() => createCategoryGroupDraft({ name: '   ' })).toThrow(InvalidCategoryGroupError);
    expect(() => createCategoryGroupDraft({ name: '' }))
      .toThrow('El nombre del grupo es obligatorio.');
  });
});
