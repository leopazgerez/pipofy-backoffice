import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProfesorFormModalComponent } from './profesor-form-modal.component';
import { Coach } from '@domain/entities/coach';

const COACH: Coach = { id: '1', displayName: 'Ana Díaz', description: 'Revés a una mano' };
const SIN_DESC: Coach = { id: '2', displayName: 'Zulema Paz', description: null };

function setup(coach: Coach, error = '') {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(ProfesorFormModalComponent);
  fixture.componentRef.setInput('error', error);
  fixture.detectChanges();
  fixture.componentInstance.open(coach);
  fixture.detectChanges();
  return fixture;
}

const area = (f: { nativeElement: HTMLElement }) =>
  f.nativeElement.querySelector('#profesor-descripcion') as HTMLTextAreaElement;

describe('ProfesorFormModalComponent', () => {
  it('precarga la descripción', () => {
    expect(area(setup(COACH)).value).toBe('Revés a una mano');
  });

  it('una descripción null llega como cadena vacía', () => {
    expect(area(setup(SIN_DESC)).value).toBe('');
  });

  it('muestra el nombre del profesor, que no es editable', () => {
    // §3.10: nombre y email viven en User y no hay endpoint que los toque, así que van como
    // encabezado y no como campo deshabilitado.
    expect(setup(COACH).nativeElement.textContent).toContain('Ana Díaz');
    expect(setup(COACH).nativeElement.querySelector('input[type="text"]')).toBeNull();
  });

  it('reabrir con OTRO profesor pisa lo tipeado', () => {
    // El <dialog> no se destruye entre aperturas: la siembra tiene que ser imperativa y por
    // parámetro (regla 3 de §8.0).
    const f = setup(COACH);
    area(f).value = 'algo tipeado';
    area(f).dispatchEvent(new Event('input'));
    f.detectChanges();
    f.componentInstance.open(SIN_DESC);
    f.detectChanges();
    expect(area(f).value).toBe('');
  });

  it('emite la descripción cruda, sin validar', () => {
    const f = setup(COACH);
    let emitido: { description: string } | undefined;
    f.componentInstance.saved.subscribe((v: { description: string }) => { emitido = v; });
    area(f).value = '  Revés a dos manos  ';
    area(f).dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
    expect(emitido).toEqual({ description: '  Revés a dos manos  ' });
  });

  it('muestra el error adentro del modal', () => {
    const f = setup(COACH, 'No encontramos lo que buscabas.');
    expect(f.nativeElement.querySelector('.notice')!.textContent).toContain('No encontramos');
  });

  it('Guardar queda deshabilitado mientras se guarda', () => {
    // Regla 5 de §8.0: sin esto, un doble click manda dos PATCH.
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const f = TestBed.createComponent(ProfesorFormModalComponent);
    f.componentRef.setInput('error', '');
    f.componentRef.setInput('saving', true);
    f.detectChanges();
    f.componentInstance.open(COACH);
    f.detectChanges();
    expect((f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).disabled).toBe(true);
  });
});
