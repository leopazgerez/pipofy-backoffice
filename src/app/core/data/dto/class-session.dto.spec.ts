import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { ClassSessionListDtoSchema, WaitingListDtoSchema } from './class-session.dto';

const row = (over: Record<string, unknown> = {}) => ({
  id: '10',
  courtId: '1',
  coachId: '2',
  categoryGroupId: '3',
  startAt: '2026-08-05T21:00:00.000Z',
  capacity: 4,
  availableSpots: 1,
  ...over,
});

describe('ClassSessionListDtoSchema', () => {
  it('parsea la fila cruda de Prisma en camelCase', () => {
    // El backend devuelve la fila sin transformar: @map() renombra la columna en la base,
    // no la propiedad en JS. Por eso este DTO es camelCase y no snake_case como el resto.
    expect(v.parse(ClassSessionListDtoSchema, [row()])[0]).toMatchObject({
      id: '10',
      courtId: '1',
      capacity: 4,
      availableSpots: 1,
    });
  });

  it('acepta capacity null y startAt null', () => {
    // Ambos son nullable en Prisma y ningún servicio los completa.
    const [parsed] = v.parse(ClassSessionListDtoSchema, [row({ capacity: null, startAt: null })]);
    expect(parsed.capacity).toBeNull();
    expect(parsed.startAt).toBeNull();
  });

  it('ignora los campos que el dashboard no usa', () => {
    // La fila trae clubId, notes, timestamps y más. valibot los descarta sin fallar.
    expect(() =>
      v.parse(ClassSessionListDtoSchema, [row({ notes: 'x', clubId: '1' })]),
    ).not.toThrow();
  });

  it('rechaza ids numéricos', () => {
    // Los BigInt de Prisma se serializan como string; un número indica que cambió el borde.
    expect(() => v.parse(ClassSessionListDtoSchema, [row({ id: 10 })])).toThrow();
  });
});

describe('WaitingListDtoSchema', () => {
  it('parsea las entradas y tolera el array vacío', () => {
    expect(v.parse(WaitingListDtoSchema, [])).toEqual([]);
    expect(v.parse(WaitingListDtoSchema, [{ id: '1' }, { id: '2' }])).toHaveLength(2);
  });

  it('no exige forma a las entradas: el consumidor sólo usa el largo', () => {
    // Deliberado: exigir campos que nadie lee haría fallar el parseo por un dato irrelevante.
    expect(v.parse(WaitingListDtoSchema, [{ cualquierCosa: 1 }, 42])).toHaveLength(2);
  });

  it('rechaza lo que no sea un array', () => {
    expect(() => v.parse(WaitingListDtoSchema, { id: '1' })).toThrow();
  });
});
