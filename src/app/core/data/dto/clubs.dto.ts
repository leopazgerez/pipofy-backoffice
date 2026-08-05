import * as v from 'valibot';

/**
 * camelCase: la API es NestJS + Prisma y el @map de Prisma es sólo a nivel de base.
 *
 * `GET /clubs/me` devuelve la fila cruda de Prisma: `tenantId`, `createdAt` y `updatedAt`
 * entran y v.object los descarta. `deletedAt` SÍ se declara porque de ahí sale `active`.
 *
 * Sin ListDtoSchema: el endpoint devuelve UN objeto, no un array.
 */
export const ClubDtoSchema = v.object({
  id: v.string(),
  name: v.nullable(v.string()),
  phone: v.nullable(v.string()),
  address: v.nullable(v.string()),
  usesLeveling: v.boolean(),
  holdMinutes: v.number(),
  transferAlias: v.nullable(v.string()),
  deletedAt: v.nullable(v.string()),
});
export type ClubDto = v.InferOutput<typeof ClubDtoSchema>;

/**
 * Write-path. Los cuatro strings SÍ aceptan null y es la única forma de vaciarlos — y acá
 * funciona en TODOS los nullables, a diferencia de las otras entidades (§3.8).
 *
 * `usesLeveling` y `holdMinutes` nunca son null: sus columnas son NOT NULL y Prisma
 * devolvería 500. `holdMinutes` va como number y no como string: el ValidationPipe corre
 * sin enableImplicitConversion, así que @IsInt() ve el tipo crudo del JSON (§3.3).
 */
export const ClubRequestSchema = v.object({
  name: v.nullable(v.string()),
  phone: v.nullable(v.string()),
  address: v.nullable(v.string()),
  usesLeveling: v.boolean(),
  holdMinutes: v.number(),
  transferAlias: v.nullable(v.string()),
});
export type ClubRequest = v.InferOutput<typeof ClubRequestSchema>;
