import { describe, it, expect } from 'vitest';
import { InMemoryDashboardRepository } from './in-memory-dashboard.repository';
import { SessionNotFoundError } from '@domain/errors';

// latencia 0: los tests no esperan de verdad.
const repo = () => new InMemoryDashboardRepository(0);

describe('InMemoryDashboardRepository', () => {
  it('devuelve un snapshot que valida contra el schema y mapea a la entidad', async () => {
    const snap = await repo().getSnapshot('c1');
    expect(snap.clubId).toBe('c1');
    expect(snap.grid.courts.length).toBeGreaterThan(0);
    expect(snap.kpis.sessionsToday).toBeGreaterThan(0);
  });

  describe('cancelSession', () => {
    it('libera el slot correcto y no toca los demás', async () => {
      const r = repo();
      const antes = await r.getSnapshot('c1');
      // La semilla tiene '7ma+8va' en Cancha 1 / 18:00 → sessions[2][0].
      expect(antes.grid.sessions[2][0]).not.toBeNull();
      const otros = antes.grid.sessions.flat().filter((s) => s !== null).length;

      const despues = await r.cancelSession('c1', { courtName: 'Cancha 1', hour: '18:00', reason: 'lluvia' });

      expect(despues.grid.sessions[2][0]).toBeNull();
      expect(despues.grid.sessions.flat().filter((s) => s !== null).length).toBe(otros - 1);
    });

    it('la mutación PERSISTE entre llamadas a getSnapshot', async () => {
      const r = repo();
      await r.cancelSession('c1', { courtName: 'Cancha 1', hour: '18:00', reason: 'otro' });
      const releido = await r.getSnapshot('c1');
      // Sin estado de instancia, la sesión "cancelada" reaparecería acá.
      expect(releido.grid.sessions[2][0]).toBeNull();
    });

    it('tira SessionNotFoundError si la cancha no existe', async () => {
      await expect(repo().cancelSession('c1', { courtName: 'Cancha 99', hour: '18:00', reason: 'otro' }))
        .rejects.toBeInstanceOf(SessionNotFoundError);
    });

    it('tira SessionNotFoundError si la hora no existe', async () => {
      await expect(repo().cancelSession('c1', { courtName: 'Cancha 1', hour: '03:00', reason: 'otro' }))
        .rejects.toBeInstanceOf(SessionNotFoundError);
    });

    it('tira SessionNotFoundError si el slot ya está vacío', async () => {
      // La semilla tiene null en Cancha 3 / 18:00 → sessions[2][2].
      await expect(repo().cancelSession('c1', { courtName: 'Cancha 3', hour: '18:00', reason: 'otro' }))
        .rejects.toBeInstanceOf(SessionNotFoundError);
    });
  });
});
