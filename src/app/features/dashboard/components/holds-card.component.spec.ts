import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { HoldsCardComponent } from './holds-card.component';
import { Hold } from '@domain/entities/dashboard-snapshot';

function mount(holds: Hold[]) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(HoldsCardComponent);
  fixture.componentRef.setInput('holds', holds);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('HoldsCardComponent', () => {
  it('muestra nombre, sesión y countdown m:ss, con el contador', () => {
    const el = mount([
      { id: 'h1', name: 'Bruno Torres', session: '7ma · C2 · 18:00', expiresInSeconds: 174 },
    ]);
    expect(el.querySelector('.cnt')?.textContent).toContain('1');
    expect(el.textContent).toContain('Bruno Torres');
    expect(el.textContent).toContain('2:54');
  });

  it('usa la clase crit cuando quedan menos de 120 s, warn si no', () => {
    const el = mount([
      { id: 'h1', name: 'A', session: 's', expiresInSeconds: 60 },
      { id: 'h2', name: 'B', session: 's', expiresInSeconds: 200 },
    ]);
    const counts = el.querySelectorAll('.count');
    expect(counts[0].classList.contains('crit')).toBe(true);
    expect(counts[1].classList.contains('warn')).toBe(true);
  });

  it('muestra el estado vacío sin holds', () => {
    const el = mount([]);
    expect(el.querySelector('.a-empty')).toBeTruthy();
    expect(el.textContent).toContain('Sin holds por vencer');
  });
});
