import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CancelSessionModalComponent, CancelTarget } from './cancel-session-modal.component';
import { CancelReason } from '@domain/entities/dashboard-snapshot';

const target: CancelTarget = {
  session: { category: '7ma+8va', professor: 'Diego A.', initials: 'D', occupied: 3, capacity: 4, state: 'open' },
  courtName: 'Cancha 1',
  hour: '18:00',
};

function mount() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CancelSessionModalComponent);
  fixture.componentRef.setInput('target', target);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

function pick(el: HTMLElement, fixture: ReturnType<typeof mount>['fixture'], value: string) {
  const sel = el.querySelector<HTMLSelectElement>('#cancel-reason')!;
  sel.value = value;
  sel.dispatchEvent(new Event('change'));
  fixture.detectChanges();
}

describe('CancelSessionModalComponent', () => {
  it('el subtítulo trae los datos de ESA sesión', () => {
    const { el } = mount();
    expect(el.querySelector('.m-sub')?.textContent).toContain('7ma+8va · Cancha 1 · 18:00 · Diego A.');
  });

  it('el motivo es requerido: arranca en el placeholder y confirmar está deshabilitado', () => {
    const { el } = mount();
    const sel = el.querySelector<HTMLSelectElement>('#cancel-reason')!;
    expect(sel.value).toBe('');
    expect(sel.required).toBe(true);
    expect(sel.hasAttribute('autofocus')).toBe(true);   // showModal() sólo autoenfoca con este atributo
    expect(el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.disabled).toBe(true);
  });

  it('elegido un motivo, confirmar se habilita y emite el CancelReason', () => {
    const { fixture, el } = mount();
    const emitted: CancelReason[] = [];
    fixture.componentInstance.confirmed.subscribe((r) => emitted.push(r));

    pick(el, fixture, 'lluvia');
    const btn = el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!;
    expect(btn.disabled).toBe(false);

    btn.click();
    fixture.detectChanges();
    expect(emitted).toEqual(['lluvia']);
  });

  it('mientras corre, el pie se oculta → doble-submit imposible', () => {
    const { fixture, el } = mount();
    pick(el, fixture, 'otro');
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('.modal-foot')?.hasAttribute('hidden')).toBe(true);
  });

  it('muestra UN solo paso, el real, y ninguno falso', () => {
    const { fixture, el } = mount();
    pick(el, fixture, 'otro');
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    fixture.detectChanges();

    const steps = el.querySelectorAll('.flow-step');
    expect(steps.length).toBe(1);
    expect(steps[0].textContent).toContain('Liberando cupo');
    // Los dominios de crédito y lista de espera están diferidos: nunca pasos falsos.
    expect(el.textContent).not.toContain('crédito');
    expect(el.textContent).not.toContain('lista de espera');
  });

  it('ningún texto promete features diferidas (créditos / lista de espera)', () => {
    const { el } = mount();
    const txt = el.textContent ?? '';
    expect(txt).toContain('Al cancelar, el cupo queda disponible en la grilla.');
    expect(txt).not.toContain('crédito');
    expect(txt).not.toContain('WhatsApp');
    expect(txt).not.toContain('lista de espera');
  });

  it('markFailed(): el paso pasa a .failed, el pie vuelve y el modal SIGUE ABIERTO', () => {
    const { fixture, el } = mount();
    fixture.componentInstance.open();          // abrir de verdad: el punto del test es que NO se cierra
    fixture.detectChanges();
    pick(el, fixture, 'profesor');
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('dialog')!.open).toBe(true);

    fixture.componentInstance.markFailed();
    fixture.detectChanges();

    expect(el.querySelector('.flow-step')?.classList.contains('failed')).toBe(true);
    expect(el.querySelector('.flow-step')?.classList.contains('active')).toBe(false);  // el spinner para
    expect(el.querySelector('.modal-foot')?.hasAttribute('hidden')).toBe(false);       // se puede reintentar
    expect(el.querySelector('dialog')!.open).toBe(true);    // el usuario ve qué falló
  });

  it('markDone() cierra el modal', () => {
    const { fixture, el } = mount();
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(el.querySelector('dialog')!.open).toBe(true);

    fixture.componentInstance.markDone();
    fixture.detectChanges();
    expect(el.querySelector('dialog')!.open).toBe(false);
  });

  it('reabrir después de un fallo resetea el flujo', () => {
    const { fixture, el } = mount();
    fixture.componentInstance.open();
    fixture.detectChanges();
    pick(el, fixture, 'otro');
    el.querySelector<HTMLButtonElement>('[data-testid="confirm"]')!.click();
    fixture.componentInstance.markFailed();
    fixture.detectChanges();

    fixture.componentInstance.open();
    fixture.detectChanges();

    expect(el.querySelector<HTMLSelectElement>('#cancel-reason')!.value).toBe('');
    expect(el.querySelector('.flow-step')).toBeNull();     // vuelve al intro
    expect(el.querySelector('.modal-foot')?.hasAttribute('hidden')).toBe(false);
  });
});
