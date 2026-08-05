import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantContext } from '../tenant/tenant-context';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantId = inject(TenantContext).tenantId();
  if (!tenantId) return next(req);
  return next(req.clone({ setHeaders: { 'X-Tenant-Id': tenantId } }));
};
