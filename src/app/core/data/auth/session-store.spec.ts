import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SessionStore } from './session-store';
import { readClubId } from './jwt-claims';

function store(): SessionStore {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), SessionStore],
  });
  return TestBed.inject(SessionStore);
}

/**
 * JWT armado a mano: header.payload.signature, payload en base64url real (RFC 7515):
 * `+`→`-`, `/`→`_`, sin padding `=`. `btoa()` solo da base64 estándar, así que se traduce
 * a mano — si no, este fixture nunca ejercita el alfabeto que un JWT real usa.
 */
function fakeJwt(payload: Record<string, unknown>): string {
  const b64url = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `h.${b64url}.s`;
}

describe('SessionStore', () => {
  beforeEach(() => localStorage.clear());

  it('arranca vacío y no autenticado', () => {
    const s = store();
    expect(s.accessToken()).toBeNull();
    expect(s.isAuthenticated()).toBe(false);
  });

  it('set() guarda los tres campos y marca autenticado', () => {
    const s = store();
    s.set({ accessToken: 'a', refreshToken: 'r', mustChangePassword: true });
    expect(s.accessToken()).toBe('a');
    expect(s.refreshToken()).toBe('r');
    expect(s.mustChangePassword()).toBe(true);
    expect(s.isAuthenticated()).toBe(true);
  });

  it('rehidrata desde localStorage al construirse', () => {
    store().set({ accessToken: 'a', refreshToken: 'r', mustChangePassword: true });
    const otro = store();               // instancia nueva, mismo localStorage
    expect(otro.accessToken()).toBe('a');
    expect(otro.mustChangePassword()).toBe(true);
  });

  it('setTokens() renueva los tokens SIN pisar mustChangePassword', () => {
    const s = store();
    s.set({ accessToken: 'a', refreshToken: 'r', mustChangePassword: true });
    s.setTokens('a2', 'r2');
    expect(s.accessToken()).toBe('a2');
    expect(s.refreshToken()).toBe('r2');
    expect(s.mustChangePassword()).toBe(true);   // <- el punto del método
  });

  it('clear() borra memoria y storage', () => {
    const s = store();
    s.set({ accessToken: 'a', refreshToken: 'r', mustChangePassword: false });
    s.clear();
    expect(s.isAuthenticated()).toBe(false);
    expect(store().accessToken()).toBeNull();
  });

  it('un localStorage con basura no rompe la construcción', () => {
    localStorage.setItem('setpoint:session:v1', 'no-es-json');
    expect(store().isAuthenticated()).toBe(false);
  });
});

describe('readClubId', () => {
  it('lee el clubId del payload', () => {
    expect(readClubId(fakeJwt({ sub: '1', clubId: '42' }))).toBe('42');
  });

  it('devuelve null si el token no tiene clubId', () => {
    expect(readClubId(fakeJwt({ sub: '1' }))).toBeNull();
  });

  it('devuelve null si el token está malformado', () => {
    expect(readClubId('no-es-un-jwt')).toBeNull();
  });

  it('lee el clubId de un token cuyo payload codifica a caracteres base64url (- o _)', () => {
    // clubId elegido para que el base64 estándar resultante contenga '/' (-> '_' en
    // base64url): sin esto el fixture no distingue atob() de un decoder base64url real.
    const token = fakeJwt({ sub: '1', clubId: '42?7' });
    expect(token).toMatch(/[-_]/);
    expect(readClubId(token)).toBe('42?7');
  });
});
