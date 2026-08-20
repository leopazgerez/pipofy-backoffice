import { describe, it, expect } from 'vitest';
import { createReservationDraft } from './reservation';
import { InvalidReservationError } from '../errors';

const input = { sessionId: '10', studentId: '4', studentPlanId: '9' };

describe('createReservationDraft', () => {
  it('devuelve el draft cuando están los tres datos', () => {
    expect(createReservationDraft(input)).toEqual(input);
  });

  it('exige alumno', () => {
    expect(() => createReservationDraft({ ...input, studentId: '' }))
      .toThrow(InvalidReservationError);
  });

  it('exige plan: sin plan la reserva no se puede confirmar', () => {
    // `ReservationsService.confirm()` responde 409 'Requiere pago manual' si la reserva no
    // tiene plan con créditos, y confirm-payment está bloqueado (no hay catálogo de métodos
    // de pago). Un hold sin plan es un cupo tomado que nadie puede cerrar.
    expect(() => createReservationDraft({ ...input, studentPlanId: '' }))
      .toThrow('Elegí un plan con créditos: sin plan la reserva no se puede confirmar.');
  });
});
