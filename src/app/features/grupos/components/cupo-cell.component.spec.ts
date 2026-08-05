import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CupoCellComponent } from './cupo-cell.component';

function mount(enrolled: number, capacity: number): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CupoCellComponent);
  fixture.componentRef.setInput('enrolled', enrolled);
  fixture.componentRef.setInput('capacity', capacity);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CupoCellComponent', () => {
  it('muestra n/N y el ancho de la barra', () => {
    const el = mount(3, 4);
    expect(el.querySelector('.cupo-num')!.textContent).toContain('3/4');
    expect(el.querySelector<HTMLElement>('.mini-bar i')!.style.width).toBe('75%');
  });

  it('lleno: clase isfull en la barra y en el número', () => {
    const el = mount(4, 4);
    expect(el.querySelector('.mini-bar i')!.classList.contains('isfull')).toBe(true);
    expect(el.querySelector('.cupo-num')!.classList.contains('isfull')).toBe(true);
  });

  it('medio vacío: clase low', () => {
    const el = mount(2, 4);
    expect(el.querySelector('.mini-bar i')!.classList.contains('low')).toBe(true);
  });

  it('estado ok: la barra NO lleva clase (el color base ya es el correcto)', () => {
    const el = mount(3, 4);
    const barra = el.querySelector('.mini-bar i')!;
    expect(barra.classList.contains('isfull')).toBe(false);
    expect(barra.classList.contains('low')).toBe(false);
  });

  it('capacity 0 no produce NaN en el ancho', () => {
    const el = mount(0, 0);
    expect(el.querySelector<HTMLElement>('.mini-bar i')!.style.width).toBe('0%');
  });
});
