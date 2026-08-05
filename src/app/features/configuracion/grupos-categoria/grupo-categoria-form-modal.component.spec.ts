import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { GrupoCategoriaFormModalComponent } from './grupo-categoria-form-modal.component';
import { CategoryGroup } from '@domain/entities/category-group';

const GRUPO: CategoryGroup = { id: '1', name: 'Principiantes' };

function setup(grupo: CategoryGroup | null, error = '') {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(GrupoCategoriaFormModalComponent);
  fixture.componentRef.setInput('error', error);
  fixture.detectChanges();
  fixture.componentInstance.open(grupo);
  fixture.detectChanges();
  return fixture;
}

const nombre = (f: { nativeElement: HTMLElement }) =>
  f.nativeElement.querySelector('#grupo-nombre') as HTMLInputElement;

describe('GrupoCategoriaFormModalComponent', () => {
  it('en alta el título dice Nuevo y el campo está vacío', () => {
    const f = setup(null);
    expect(f.nativeElement.querySelector('.modal-head h3')!.textContent).toContain('Nuevo grupo');
    expect(nombre(f).value).toBe('');
  });

  it('en edición el título dice Editar y precarga el nombre', () => {
    const f = setup(GRUPO);
    expect(f.nativeElement.querySelector('.modal-head h3')!.textContent).toContain('Editar grupo');
    expect(nombre(f).value).toBe('Principiantes');
  });

  it('reabrir en alta después de tipear deja el formulario vacío', () => {
    // El bug del slice anterior: con un effect() sobre un input, `editing.set(null)` sobre un
    // signal que YA vale null no dispara nada, y dos altas seguidas reabrían con lo tipeado.
    // Un Guardar de más creaba un duplicado.
    const f = setup(null);
    nombre(f).value = 'Avanzados';
    nombre(f).dispatchEvent(new Event('input'));
    f.detectChanges();

    f.componentInstance.open(null);
    f.detectChanges();
    expect(nombre(f).value).toBe('');
  });

  it('pasar de editar a alta limpia el campo', () => {
    const f = setup(GRUPO);
    f.componentInstance.open(null);
    f.detectChanges();
    expect(nombre(f).value).toBe('');
  });

  it('emite lo que hay sin validar', () => {
    // La invariante vive en createCategoryGroupDraft, que corre en la facade: duplicarla acá
    // daría dos copys que se desincronizan.
    const f = setup(null);
    let emitido: unknown;
    f.componentInstance.saved.subscribe((v: unknown) => { emitido = v; });
    nombre(f).value = '  ';
    nombre(f).dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
    expect(emitido).toEqual({ name: '  ' });
  });

  it('muestra el error adentro del modal', () => {
    // El .notice de la página queda detrás del ::backdrop, que tiene scrim + blur(4px).
    const f = setup(GRUPO, 'El nombre del grupo es obligatorio.');
    expect(f.nativeElement.querySelector('.notice')!.textContent)
      .toContain('El nombre del grupo es obligatorio.');
  });
});
