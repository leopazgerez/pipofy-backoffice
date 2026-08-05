import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import * as v from 'valibot';
import { DashboardRepository } from '@domain/contracts/dashboard.repository';
import { CancelSessionRequest, DashboardSnapshot } from '@domain/entities/dashboard-snapshot';
import { CancelSessionDtoSchema, DashboardDtoSchema } from '../dto/dashboard.dto';
import { toCancelSessionDto, toDashboardSnapshot } from '../mappers/dashboard.mapper';
import { toDomainError } from '../http/to-domain-error';
import { ApiClient } from '../http/api-client';

// ponytail: impl HTTP de REFERENCIA. Hoy NO la bindea nadie (la ruta usa
// InMemoryDashboardRepository para la demo sin backend). Cuando exista la API, bindear esta
// clase en dashboard.providers.ts (useClass) en vez del in-memory: el contrato y los mappers
// (ida Y vuelta) ya están listos. Sin stream(): el "En vivo" del dashboard es una cuenta
// regresiva client-side.
@Injectable()
export class HttpDashboardRepository implements DashboardRepository {
  /* eslint-disable @angular-eslint/prefer-inject */
  constructor(private readonly api: ApiClient = inject(ApiClient)) {}
  /* eslint-enable @angular-eslint/prefer-inject */

  async getSnapshot(clubId: string): Promise<DashboardSnapshot> {
    try {
      const raw = await firstValueFrom(this.api.get<unknown>(`/clubs/${clubId}/snapshot`));
      const dto = v.parse(DashboardDtoSchema, raw);
      return toDashboardSnapshot(dto);
    } catch (err) {
      throw toDomainError(err);
    }
  }

  async cancelSession(clubId: string, req: CancelSessionRequest): Promise<DashboardSnapshot> {
    try {
      // Convención del write-path: el DTO de ida se valida con v.parse ANTES de salir,
      // igual que la respuesta al entrar.
      const body = v.parse(CancelSessionDtoSchema, toCancelSessionDto(req));
      const raw = await firstValueFrom(this.api.post<unknown>(`/clubs/${clubId}/sessions/cancel`, body));
      const dto = v.parse(DashboardDtoSchema, raw);
      return toDashboardSnapshot(dto);
    } catch (err) {
      throw toDomainError(err);
    }
  }
}
