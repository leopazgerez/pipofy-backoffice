import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ConfirmDeleteModalComponent } from './confirm-delete-modal.component';

function setup(itemName = 'Cancha 1') {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(ConfirmDeleteModalComponent);
  fixture.componentRef.setInput('itemName', itemName);
  fixture.detectChanges();
  return fixture;
}

describe('ConfirmDeleteModalComponent', () => {
  it('nombra el ítem en la pregunta', () => {
    const text = setup('Cancha 1').nativeElement.textContent as string;
    expect(text).toContain('¿Eliminar Cancha 1?');
    expect(text).toContain('Esta acción no se puede deshacer.');
  });

  it('emite confirmed al apretar el botón de eliminar', () => {
    const fixture = setup();
    let emitted = 0;
    fixture.componentInstance.confirmed.subscribe(() => { emitted += 1; });

    const btn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-test="confirm"]');
    btn.click();

    expect(emitted).toBe(1);
  });
});
