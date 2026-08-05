import { describe, it, expect } from 'vitest';

describe('workspace smoke', () => {
  it('runs pure TS tests', () => {
    expect(2 + 2).toBe(4);
  });
});
