import { ComponentFixture } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';

/**
 * Helpers de las specs de las pantallas de auth. `set()` estaba copiado en cuatro specs y
 * `submit()` en dos.
 *
 * Sólo lo usan los tests, pero NO vive en un `.spec.ts`: importar de un spec hace que el
 * runner lo levante como suite y falle por "no tests".
 */
export function set(root: HTMLElement, selector: string, value: string): void {
  const input = root.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

/** Carga los campos indicados por selector y dispara el submit del form. Devuelve la raíz. */
export async function submitForm(
  fixture: ComponentFixture<unknown> | RouterTestingHarness,
  values: Record<string, string>,
): Promise<HTMLElement> {
  const f = 'fixture' in fixture ? fixture.fixture : fixture;
  const root: HTMLElement = f.nativeElement;
  for (const [selector, value] of Object.entries(values)) set(root, selector, value);
  f.detectChanges();
  root.querySelector('form')!.dispatchEvent(new Event('submit'));
  await f.whenStable();
  f.detectChanges();
  return root;
}
