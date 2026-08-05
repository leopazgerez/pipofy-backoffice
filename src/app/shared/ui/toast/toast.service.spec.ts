import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToastService } from './toast.service';

function svc() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(ToastService);
}

describe('ToastService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('show() apila un toast visible', () => {
    const s = svc();
    s.show('ok', 'Cupo liberado', 'detalle');
    expect(s.toasts().length).toBe(1);
    expect(s.toasts()[0]).toMatchObject({ type: 'ok', title: 'Cupo liberado', desc: 'detalle', leaving: false });
  });

  it('asigna ids únicos', () => {
    const s = svc();
    s.show('ok', 'a', '1');
    s.show('info', 'b', '2');
    expect(s.toasts()[0].id).not.toBe(s.toasts()[1].id);
  });

  it('a los 3600ms marca leaving, y NO lo remueve todavía', () => {
    const s = svc();
    s.show('ok', 'a', '1');
    vi.advanceTimersByTime(3599);
    expect(s.toasts()[0].leaving).toBe(false);
    vi.advanceTimersByTime(1);
    expect(s.toasts().length).toBe(1);
    expect(s.toasts()[0].leaving).toBe(true);
  });

  it('recién 300ms después de leaving lo remueve (cierre en 2 fases)', () => {
    const s = svc();
    s.show('ok', 'a', '1');
    vi.advanceTimersByTime(3600);
    vi.advanceTimersByTime(299);
    expect(s.toasts().length).toBe(1);   // sigue en el DOM: la animación .out corre acá
    vi.advanceTimersByTime(1);
    expect(s.toasts().length).toBe(0);
  });

  it('dismiss(id) hace el mismo recorrido de 2 fases sobre el toast correcto', () => {
    const s = svc();
    s.show('ok', 'a', '1');
    s.show('info', 'b', '2');
    const id = s.toasts()[0].id;

    s.dismiss(id);
    expect(s.toasts().length).toBe(2);
    expect(s.toasts().find((t) => t.id === id)?.leaving).toBe(true);
    expect(s.toasts().find((t) => t.id !== id)?.leaving).toBe(false);

    vi.advanceTimersByTime(300);
    expect(s.toasts().length).toBe(1);
    expect(s.toasts()[0].title).toBe('b');
  });

  it('dismiss() sobre un id inexistente o ya saliendo no rompe ni duplica', () => {
    const s = svc();
    s.show('ok', 'a', '1');
    const id = s.toasts()[0].id;
    s.dismiss(id);
    s.dismiss(id);        // idempotente
    s.dismiss(9999);      // inexistente
    vi.advanceTimersByTime(300);
    expect(s.toasts().length).toBe(0);
  });
});
