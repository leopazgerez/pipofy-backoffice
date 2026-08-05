import { describe, it, expect } from 'vitest';
import { createCourtDraft } from './court';
import { InvalidCourtError } from '../errors';

const base = { name: 'Cancha 1', code: 'C1', surfaceTypeId: '3', indoor: true, courtStatusId: '1' };

describe('createCourtDraft', () => {
  it('recorta el nombre y deja el resto tal cual', () => {
    expect(createCourtDraft({ ...base, name: '  Cancha 1  ' })).toEqual({
      name: 'Cancha 1', code: 'C1', surfaceTypeId: '3', indoor: true, courtStatusId: '1',
    });
  });

  it('tira InvalidCourtError cuando el nombre está vacío', () => {
    // El backend acepta POST /courts con {} y crea una cancha sin nombre (§4.6):
    // esta invariante es la ÚNICA que lo impide.
    expect(() => createCourtDraft({ ...base, name: '   ' })).toThrow(InvalidCourtError);
  });

  it('normaliza los strings vacíos del formulario a null', () => {
    // '' y null son lo mismo para el backend, pero no para el mapper: de esta
    // distinción depende que el FK se omita en vez de mandarse (§4.5).
    expect(createCourtDraft({ name: 'Cancha 2', code: '', surfaceTypeId: '', indoor: false, courtStatusId: '' }))
      .toEqual({ name: 'Cancha 2', code: null, surfaceTypeId: null, indoor: false, courtStatusId: null });
  });
});
