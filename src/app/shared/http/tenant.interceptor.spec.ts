import { describe, it, expect } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import { tenantInterceptor } from './tenant.interceptor';
import { TenantContext } from '../tenant/tenant-context';

describe('tenantInterceptor', () => {
  it('adds X-Tenant-Id when a tenant is set', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.inject(TenantContext).set('club-7');
    const req = new HttpRequest('GET', '/api/x');
    let seen: HttpRequest<unknown> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const next = (r: HttpRequest<unknown>) => { seen = r; return of<any>({}); };
    TestBed.runInInjectionContext(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
      tenantInterceptor(req, next as any).subscribe()
    );
    expect(seen!.headers.get('X-Tenant-Id')).toBe('club-7');
  });

  it('leaves the request untouched when no tenant is set', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const req = new HttpRequest('GET', '/api/x');
    let seen: HttpRequest<unknown> | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
    const next = (r: HttpRequest<unknown>) => { seen = r; return of<any>({}); };
    TestBed.runInInjectionContext(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
      tenantInterceptor(req, next as any).subscribe()
    );
    expect(seen!.headers.has('X-Tenant-Id')).toBe(false);
  });
});
