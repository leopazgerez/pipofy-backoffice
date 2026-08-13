import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { KpiRowComponent } from './kpi-row.component';
import { Kpis } from '@domain/entities/dashboard-snapshot';

const kpis: Kpis = { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86 };

function mount() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(KpiRowComponent);
  fixture.componentRef.setInput('kpis', kpis);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('KpiRowComponent', () => {
  it('renderiza las 2 tarjetas con sus valores', () => {
    // Son 2 y no 4: recaudación y holds se fueron con el recorte contra la API real
    // (spec §4), porque no hay endpoint de pagos ni forma de listar reservas.
    const el = mount();
    const cards = el.querySelectorAll('.kpi');
    expect(cards.length).toBe(2);
    const text = el.textContent ?? '';
    expect(text).toContain('18');
    expect(text).toContain('24 canchas');
    expect(text).toContain('86');
  });
});
