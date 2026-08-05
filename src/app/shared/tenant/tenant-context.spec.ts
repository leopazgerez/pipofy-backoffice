import { describe, it, expect } from 'vitest';
import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  it('starts null and updates on set', () => {
    const ctx = new TenantContext();
    expect(ctx.tenantId()).toBeNull();
    ctx.set('club-42');
    expect(ctx.tenantId()).toBe('club-42');
  });
});
