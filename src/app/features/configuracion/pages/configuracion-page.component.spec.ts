import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ConfiguracionPageComponent } from './configuracion-page.component';

describe('ConfiguracionPageComponent', () => {
  it('muestra un tab por entidad configurable', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });
    const fixture = TestBed.createComponent(ConfiguracionPageComponent);
    fixture.detectChanges();

    const tabs: HTMLAnchorElement[] = Array.from(fixture.nativeElement.querySelectorAll('[data-test="tab"]'));
    expect(tabs.map((t) => t.textContent?.trim()))
      .toEqual(['Club', 'Canchas', 'Categorías', 'Grupos de categoría', 'Planes', 'Profesores', 'Horarios']);
  });
});
