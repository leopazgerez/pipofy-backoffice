import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component } from '@angular/core';
import { authGuard } from './auth.guard';
import { SessionStore } from '@data/auth/session-store';

@Component({ standalone: true, template: 'privado' })
class PrivadoComponent {}

@Component({ standalone: true, template: 'login' })
class LoginStubComponent {}

async function harness(conSesion: boolean) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      SessionStore,
      provideRouter([
        { path: 'login', component: LoginStubComponent },
        { path: 'dashboard', component: PrivadoComponent, canActivate: [authGuard] },
      ]),
    ],
  });
  if (conSesion) {
    TestBed.inject(SessionStore).set({ accessToken: 'a', refreshToken: 'r', mustChangePassword: false });
  }
  return RouterTestingHarness.create();
}

describe('authGuard', () => {
  beforeEach(() => localStorage.clear());

  it('con sesión deja pasar', async () => {
    const h = await harness(true);
    await h.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/dashboard');
  });

  it('sin sesión redirige a /login conservando returnUrl', async () => {
    const h = await harness(false);
    await h.navigateByUrl('/dashboard');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Fdashboard');
  });

  it('devuelve un UrlTree, no un booleano, cuando bloquea', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), SessionStore, provideRouter([])],
    });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/grupos/3' } as never),
    );
    expect(result).toBeInstanceOf(UrlTree);
  });
});
