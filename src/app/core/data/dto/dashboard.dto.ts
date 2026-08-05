import * as v from 'valibot';

// snake_case = shape crudo del backend. El schema es la única fuente de verdad del tipo.
const SurfaceSchema = v.picklist(['padel', 'tenis']);
const SessionStateSchema = v.picklist(['full', 'open', 'wait']);

const KpisDtoSchema = v.object({
  sessions_today: v.number(),
  courts_total: v.number(),
  occupancy_pct: v.number(),
  revenue_today_cents: v.number(),
});

const CourtDtoSchema = v.object({
  name: v.string(),
  surface: SurfaceSchema,
  meta: v.string(),
});

const CourtSessionDtoSchema = v.object({
  category: v.string(),
  professor: v.string(),
  initials: v.string(),
  occupied: v.number(),
  capacity: v.number(),
  state: SessionStateSchema,
});

const CourtGridDtoSchema = v.object({
  courts: v.array(CourtDtoSchema),
  hours: v.array(v.string()),
  sessions: v.array(v.array(v.nullable(CourtSessionDtoSchema))),
});

const HoldDtoSchema = v.object({
  id: v.string(),
  name: v.string(),
  session: v.string(),
  expires_in_seconds: v.number(),
});

const WaitlistDtoSchema = v.object({
  id: v.string(),
  title: v.string(),
  meta: v.string(),
});

const TransferDtoSchema = v.object({
  id: v.string(),
  name: v.string(),
  plan: v.string(),
  amount_cents: v.number(),
});

export const DashboardDtoSchema = v.object({
  club_id: v.string(),
  kpis: KpisDtoSchema,
  grid: CourtGridDtoSchema,
  holds: v.array(HoldDtoSchema),
  waitlist: v.array(WaitlistDtoSchema),
  transfers: v.array(TransferDtoSchema),
});

export type DashboardDto = v.InferOutput<typeof DashboardDtoSchema>;

/**
 * Write-path: el PRIMER DTO de ida (dominio → wire) de todo el repo. Hasta acá
 * sólo existía la dirección de vuelta (respuesta → entidad).
 *
 * CONVENCIÓN QUE ESTE SLICE ESTABLECE: los DTO de request se validan con
 * `v.parse` ANTES de salir, igual que las respuestas al entrar. El borde se
 * valida en las dos direcciones.
 */
export const CancelSessionDtoSchema = v.object({
  court_name: v.string(),
  hour: v.string(),
  reason: v.picklist(['profesor', 'lluvia', 'incompleto', 'otro']),
});
export type CancelSessionDto = v.InferOutput<typeof CancelSessionDtoSchema>;
