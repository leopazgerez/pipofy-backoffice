import { describe, it, expect } from 'vitest';
import { createCategoryDraft } from './category';
import { InvalidCategoryError } from '../errors';

describe('createCategoryDraft', () => {
  it('recorta el nombre y convierte el orden a número', () => {
    expect(createCategoryDraft({ name: '  4ta  ', levelOrder: '4' }))
      .toEqual({ name: '4ta', levelOrder: 4 });
  });

  it('tira InvalidCategoryError cuando el nombre está vacío', () => {
    expect(() => createCategoryDraft({ name: '  ', levelOrder: '1' })).toThrow(InvalidCategoryError);
  });

  it('un orden vacío es null, no 0', () => {
    // 0 es un orden válido y significa "primera de todas"; vacío significa "sin jerarquizar".
    expect(createCategoryDraft({ name: 'Iniciación', levelOrder: '' }))
      .toEqual({ name: 'Iniciación', levelOrder: null });
  });

  it('acepta el 0 como orden', () => {
    expect(createCategoryDraft({ name: 'Primera', levelOrder: '0' }))
      .toEqual({ name: 'Primera', levelOrder: 0 });
  });

  it('rechaza un orden que no es entero de 0 en adelante', () => {
    expect(() => createCategoryDraft({ name: '4ta', levelOrder: '2.5' })).toThrow(InvalidCategoryError);
    expect(() => createCategoryDraft({ name: '4ta', levelOrder: '-1' })).toThrow(InvalidCategoryError);
    expect(() => createCategoryDraft({ name: '4ta', levelOrder: 'abc' })).toThrow(InvalidCategoryError);
  });
});
