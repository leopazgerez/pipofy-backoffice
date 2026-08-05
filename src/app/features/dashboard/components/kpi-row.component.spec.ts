import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { KpiRowComponent } from './kpi-row.component';
import { Kpis } from '@domain/entities/dashboard-snapshot';

const kpis: Kpis = { sessionsToday: 18, courtsTotal: 24, occupancyPct: 86, revenueTodayCents: 24_850_000 };

function mount(activeHolds: number) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(KpiRowComponent);
  fixture.componentRef.setInput('kpis', kpis);
  fixture.componentRef.setInput('activeHolds', activeHolds);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('KpiRowComponent', () => {
  it('renderiza las 4 tarjetas con sus valores', () => {
    const el = mount(3);
    const cards = el.querySelectorAll('.kpi');
    expect(cards.length).toBe(4);
    const text = el.textContent ?? '';
    expect(text).toContain('18');
    expect(text).toContain('24 canchas');
    expect(text).toContain('86');
    expect(text).toContain('$248.500');
  });

  it('muestra activeHolds (valor vivo, no del snapshot)', () => {
    const el = mount(2);
    expect(el.querySelectorAll('.kpi')[2].textContent).toContain('2');
  });
});
