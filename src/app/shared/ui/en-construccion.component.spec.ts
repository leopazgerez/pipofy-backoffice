import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { EnConstruccionComponent } from './en-construccion.component';

describe('EnConstruccionComponent', () => {
  it('muestra el title del data de la ruta', async () => {
    await TestBed.configureTestingModule({
      imports: [EnConstruccionComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { title: 'Grupos y clases' } } } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EnConstruccionComponent);
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Grupos y clases');
    expect(fixture.nativeElement.textContent).toContain('construcción');
  });
});
