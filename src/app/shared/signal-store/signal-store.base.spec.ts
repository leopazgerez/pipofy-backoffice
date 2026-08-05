import { describe, it, expect } from 'vitest';
import { SignalStore } from './signal-store.base';

class TestStore extends SignalStore<number> {
  load(p: Promise<number>) { return this.run(p); }
}

describe('SignalStore', () => {
  it('starts empty', () => {
    const s = new TestStore();
    expect(s.data()).toBeNull();
    expect(s.loading()).toBe(false);
    expect(s.error()).toBeNull();
  });

  it('captures data on success and clears loading', async () => {
    const s = new TestStore();
    await s.load(Promise.resolve(42));
    expect(s.data()).toBe(42);
    expect(s.loading()).toBe(false);
    expect(s.error()).toBeNull();
  });

  it('captures the error value on failure', async () => {
    const s = new TestStore();
    await s.load(Promise.reject({ kind: 'not-found' }));
    expect(s.error()).toEqual({ kind: 'not-found' });
    expect(s.loading()).toBe(false);
  });

  it('reset clears everything', async () => {
    const s = new TestStore();
    await s.load(Promise.resolve(42));
    s.reset();
    expect(s.data()).toBeNull();
    expect(s.error()).toBeNull();
  });
});
