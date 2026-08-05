import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantContext {
  private readonly _tenantId = signal<string | null>(null);
  readonly tenantId = this._tenantId.asReadonly();
  set(id: string | null): void { this._tenantId.set(id); }
}
