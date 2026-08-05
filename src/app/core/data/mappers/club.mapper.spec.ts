import { describe, it, expect } from 'vitest';
import { ClubDto } from '../dto/clubs.dto';
import { toClub, toClubRequest } from './club.mapper';
import { ClubDraft } from '@domain/entities/club';

const DTO: ClubDto = {
  id: '1',
  name: 'Club Central',
  phone: '1155667788',
  address: 'Av. Siempreviva 742',
  usesLeveling: true,
  holdMinutes: 30,
  transferAlias: 'club.central.mp',
  deletedAt: null,
};

describe('toClub', () => {
  it('mapea los seis campos', () => {
    expect(toClub(DTO)).toEqual({
      id: '1',
      name: 'Club Central',
      phone: '1155667788',
      address: 'Av. Siempreviva 742',
      usesLeveling: true,
      holdMinutes: 30,
      transferAlias: 'club.central.mp',
      active: true,
    });
  });

  it('name null se vuelve cadena vacía', () => {
    expect(toClub({ ...DTO, name: null }).name).toBe('');
  });

  it('active sale de deletedAt: es lo único que lee RefreshDashboard', () => {
    expect(toClub({ ...DTO, deletedAt: null }).active).toBe(true);
    expect(toClub({ ...DTO, deletedAt: '2026-01-01T00:00:00.000Z' }).active).toBe(false);
  });

  it('conserva los nullables en null', () => {
    const club = toClub({ ...DTO, phone: null, address: null, transferAlias: null });
    expect(club.phone).toBeNull();
    expect(club.address).toBeNull();
    expect(club.transferAlias).toBeNull();
  });
});

describe('toClubRequest', () => {
  const DRAFT: ClubDraft = {
    name: 'Club Central',
    phone: '1155667788',
    address: 'Av. Siempreviva 742',
    usesLeveling: true,
    holdMinutes: 30,
    transferAlias: 'club.central.mp',
  };

  it('manda los seis campos, sin omitir ninguno', () => {
    expect(toClubRequest(DRAFT)).toEqual(DRAFT);
  });

  it('MANDA los nullables EN null: es lo que los vacía (§3.8)', () => {
    // Contraste deliberado con toScheduleRequest, que OMITE validFrom/validTo. Los dos
    // tests existen para que un refactor que "unifique" los mappers rompa en rojo.
    const req = toClubRequest({ ...DRAFT, name: null, phone: null, address: null, transferAlias: null });
    expect(req).toEqual({
      name: null,
      phone: null,
      address: null,
      usesLeveling: true,
      holdMinutes: 30,
      transferAlias: null,
    });
    expect('name' in req).toBe(true);
  });
});
