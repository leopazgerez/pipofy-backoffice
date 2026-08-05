import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RoleStepComponent } from './role-step.component';
import { Role } from '@domain/entities/registration';

async function render() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(RoleStepComponent);
  const control = new FormControl<Role | null>(null);
  fixture.componentRef.setInput('control', control);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, control, el: fixture.nativeElement as HTMLElement };
}

describe('RoleStepComponent', () => {
  it('renderiza un radiogroup con los dos roles', async () => {
    const { el } = await render();
    expect(el.querySelector('[role="radiogroup"]')).not.toBeNull();
    const radios = el.querySelectorAll('input[type="radio"][name="role"]');
    expect(radios.length).toBe(2);
  });

  it('al elegir "club" el control toma ese valor', async () => {
    const { fixture, control, el } = await render();
    const club = el.querySelector<HTMLInputElement>('input[value="club"]')!;
    club.click();
    await fixture.whenStable();
    expect(control.value).toBe('club');
  });
});
