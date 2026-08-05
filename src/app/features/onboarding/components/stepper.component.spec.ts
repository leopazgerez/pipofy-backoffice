import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StepperComponent } from './stepper.component';

async function render(activeNode: number, labels = ['Rol', 'Cuenta', 'Confirmar']) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(StepperComponent);
  fixture.componentRef.setInput('activeNode', activeNode);
  fixture.componentRef.setInput('labels', labels);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('StepperComponent', () => {
  it('marca el nodo activo con aria-current=step y estado current', async () => {
    const el = await render(1);
    const items = Array.from(el.querySelectorAll('li'));
    expect(items).toHaveLength(3);
    expect(items[1].getAttribute('aria-current')).toBe('step');
    expect(items[1].getAttribute('data-state')).toBe('current');
    expect(items[0].getAttribute('data-state')).toBe('done');
    expect(items[2].getAttribute('data-state')).toBe('todo');
  });

  it('usa los labels recibidos para cada nodo', async () => {
    const el = await render(2, ['Rol', 'Cuenta', 'Confirmar']);
    expect(el.querySelectorAll('li')[2].textContent).toContain('Confirmar');
  });
});
