import { describe, it, expect } from 'vitest';
import { ClubInput, createClubDraft } from './club';
import { InvalidClubError } from '../errors';

const BASE: ClubInput = {
  name: 'Club Central',
  phone: '1155667788',
  address: 'Av. Siempreviva 742',
  usesLeveling: true,
  holdMinutes: '30',
  transferAlias: 'club.central.mp',
};

describe('createClubDraft', () => {
  it('pasa los seis campos', () => {
    expect(createClubDraft(BASE)).toEqual({
      name: 'Club Central',
      phone: '1155667788',
      address: 'Av. Siempreviva 742',
      usesLeveling: true,
      holdMinutes: 30,
      transferAlias: 'club.central.mp',
    });
  });

  it('los cuatro strings vacíos viajan EN null: es la única entidad donde eso los vacía', () => {
    // §3.8: @IsOptional() deja pasar el null y clubs.service hace `data: dto` crudo, así que
    // Prisma escribe NULL en las cuatro columnas String?.
    const draft = createClubDraft({ ...BASE, name: '', phone: '   ', address: '', transferAlias: '  ' });
    expect(draft.name).toBeNull();
    expect(draft.phone).toBeNull();
    expect(draft.address).toBeNull();
    expect(draft.transferAlias).toBeNull();
  });

  it('recorta los espacios de los cuatro strings', () => {
    const draft = createClubDraft({ ...BASE, name: '  Club Central  ', transferAlias: ' alias ' });
    expect(draft.name).toBe('Club Central');
    expect(draft.transferAlias).toBe('alias');
  });

  it('holdMinutes vacío tira, porque su columna es Int NOT NULL', () => {
    expect(() => createClubDraft({ ...BASE, holdMinutes: '' })).toThrow(InvalidClubError);
    expect(() => createClubDraft({ ...BASE, holdMinutes: '   ' })).toThrow(InvalidClubError);
  });

  it('holdMinutes menor a 1 tira: el backend valida @Min(1)', () => {
    expect(() => createClubDraft({ ...BASE, holdMinutes: '0' })).toThrow(InvalidClubError);
    expect(() => createClubDraft({ ...BASE, holdMinutes: '-5' })).toThrow(InvalidClubError);
  });

  it('holdMinutes decimal tira: @IsInt() en el backend', () => {
    expect(() => createClubDraft({ ...BASE, holdMinutes: '30.5' })).toThrow(InvalidClubError);
  });

  it('holdMinutes no numérico tira', () => {
    expect(() => createClubDraft({ ...BASE, holdMinutes: 'treinta' })).toThrow(InvalidClubError);
  });

  it('el mensaje del error nombra el campo', () => {
    expect(() => createClubDraft({ ...BASE, holdMinutes: '' }))
      .toThrow(/minutos de reserva/i);
  });

  it('usesLeveling viaja tal cual, en los dos valores', () => {
    expect(createClubDraft({ ...BASE, usesLeveling: false }).usesLeveling).toBe(false);
    expect(createClubDraft({ ...BASE, usesLeveling: true }).usesLeveling).toBe(true);
  });
});
