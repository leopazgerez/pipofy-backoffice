import { describe, it, expect } from 'vitest';
import { createPlanDraft, PlanInput } from './plan';
import { InvalidPlanError, InvalidNumberError } from '../errors';

const base: PlanInput = {
  name: 'Mensual 8 clases',
  planTypeId: '1',
  coachId: '5',
  classCount: '8',
  price: '12000.50',
  validityDays: '30',
  active: true,
};

describe('createPlanDraft', () => {
  it('arma el draft completo', () => {
    expect(createPlanDraft(base)).toEqual({
      name: 'Mensual 8 clases',
      planTypeId: '1',
      coachId: '5',
      classCount: 8,
      price: '12000.50',
      validityDays: 30,
      active: true,
    });
  });

  it('los opcionales vacíos quedan en null', () => {
    const draft = createPlanDraft({ ...base, coachId: '', classCount: '', price: '  ', validityDays: '' });
    expect(draft.coachId).toBeNull();
    expect(draft.classCount).toBeNull();
    expect(draft.price).toBeNull();
    expect(draft.validityDays).toBeNull();
  });

  it('exige nombre', () => {
    expect(() => createPlanDraft({ ...base, name: '  ' }))
      .toThrow('El nombre del plan es obligatorio.');
  });

  it('exige tipo de plan', () => {
    // planTypeId es @IsString() SIN @IsOptional() también en el PATCH (§3.4): sin esto el
    // backend responde 400 con un mensaje que no dice cuál es el campo.
    expect(() => createPlanDraft({ ...base, planTypeId: '' })).toThrow(InvalidPlanError);
    expect(() => createPlanDraft({ ...base, planTypeId: '' })).toThrow('Elegí un tipo de plan.');
  });

  it('rechaza una cantidad de clases decimal', () => {
    expect(() => createPlanDraft({ ...base, classCount: '2.5' })).toThrow(InvalidNumberError);
  });

  it('el precio viaja como string, no como number', () => {
    // El backend lo valida con @IsNumberString() y un número JSON da 400 (§3.5).
    expect(typeof createPlanDraft(base).price).toBe('string');
  });
});
