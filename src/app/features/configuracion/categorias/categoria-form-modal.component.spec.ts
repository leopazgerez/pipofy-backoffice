import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { CategoriaFormModalComponent } from './categoria-form-modal.component';
import { Category } from '@domain/entities/category';

/**
 * El formulario se siembra en open(), no en un effect sobre un input: sin abrirlo, los signals
 * están en sus valores iniciales. Mismo arranque que attendance-modal.component.spec.ts:30.
 */
function setup(category: Category | null, error = '') {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(CategoriaFormModalComponent);
  fixture.componentRef.setInput('error', error);
  fixture.detectChanges();
  fixture.componentInstance.open(category);
  fixture.detectChanges();
  return fixture;
}

function guardar(fixture: { nativeElement: HTMLElement; componentInstance: CategoriaFormModalComponent }): unknown {
  let emitted: unknown = null;
  fixture.componentInstance.saved.subscribe((v) => { emitted = v; });
  (fixture.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
  return emitted;
}

describe('CategoriaFormModalComponent', () => {
  it('en alta arranca con los campos vacíos', () => {
    expect(guardar(setup(null))).toEqual({ name: '', levelOrder: '' });
  });

  it('en edición precarga nombre y orden', () => {
    expect(guardar(setup({ id: '1', name: '4ta', levelOrder: 4 }))).toEqual({ name: '4ta', levelOrder: '4' });
  });

  it('un orden null se precarga como string vacío, no como "null"', () => {
    expect(guardar(setup({ id: '2', name: 'Iniciación', levelOrder: null })))
      .toEqual({ name: 'Iniciación', levelOrder: '' });
  });

  it('REABRIR en alta arranca en limpio, aunque el input no haya cambiado', () => {
    // El camino real: crear "5ta" → guardar → cerrar → "+ Nueva categoría". `editing` nunca dejó
    // de ser null, así que un effect sobre el input no se re-dispara y el formulario reaparecía
    // con "5ta" cargada: un Guardar de más crea un duplicado.
    const fixture = setup(null);
    const nombre = fixture.nativeElement.querySelector('#categoria-nombre') as HTMLInputElement;
    nombre.value = '5ta';
    nombre.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.componentInstance.close();
    fixture.componentInstance.open(null);
    fixture.detectChanges();

    expect((fixture.nativeElement.querySelector('#categoria-nombre') as HTMLInputElement).value).toBe('');
    expect(guardar(fixture)).toEqual({ name: '', levelOrder: '' });
  });

  it('muestra el error de la facade DENTRO del modal', () => {
    // §8.3. En la página el .notice queda detrás del ::backdrop (scrim + blur, components.css:254).
    const fixture = setup(null, 'El nombre de la categoría es obligatorio.');
    const aviso = fixture.nativeElement.querySelector('dialog [role="alert"]') as HTMLElement;
    expect(aviso.textContent).toContain('El nombre de la categoría es obligatorio.');
  });

  it('sin error no renderiza el aviso', () => {
    expect(setup(null).nativeElement.querySelector('dialog [role="alert"]')).toBeNull();
  });
});
