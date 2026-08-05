import { describe, it, expect } from 'vitest';
import { Component, ViewChild, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ModalComponent } from './modal.component';

@Component({
  standalone: true,
  imports: [ModalComponent],
  template: `
    <app-modal #m title="Cancelar sesión" subtitle="7ma+8va · Cancha 1 · 18:00" icon="danger" (closed)="closes = closes + 1">
      <svg modal-icon data-testid="ic"></svg>
      <p data-testid="body">Cuerpo</p>
      <div class="modal-foot" modal-foot><button type="button" data-testid="foot-btn">Volver</button></div>
    </app-modal>
  `,
})
class HostComponent {
  @ViewChild('m') modal!: ModalComponent;
  closes = 0;
}

function mount() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, dlg: el.querySelector('dialog') as HTMLDialogElement };
}

describe('ModalComponent', () => {
  it('open() abre el dialog y close() lo cierra', () => {
    const { fixture, dlg } = mount();
    expect(dlg.open).toBe(false);
    fixture.componentInstance.modal.open();
    expect(dlg.open).toBe(true);
    fixture.componentInstance.modal.close();
    expect(dlg.open).toBe(false);
  });

  it('emite closed cuando el dialog se cierra', () => {
    const { fixture } = mount();
    fixture.componentInstance.modal.open();
    fixture.componentInstance.modal.close();
    expect(fixture.componentInstance.closes).toBe(1);
  });

  it('el botón X cierra', () => {
    const { fixture, el, dlg } = mount();
    fixture.componentInstance.modal.open();
    el.querySelector<HTMLButtonElement>('.modal-head .x')!.click();
    expect(dlg.open).toBe(false);
  });

  it('un click en el backdrop cierra (el target es el propio dialog)', () => {
    const { fixture, dlg } = mount();
    fixture.componentInstance.modal.open();
    dlg.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dlg.open).toBe(false);
  });

  it('un click DENTRO del modal NO cierra', () => {
    const { fixture, el, dlg } = mount();
    fixture.componentInstance.modal.open();
    el.querySelector<HTMLElement>('[data-testid="body"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(dlg.open).toBe(true);
  });

  it('renderiza título y subtítulo, y proyecta icono / cuerpo / pie', () => {
    const { el } = mount();
    expect(el.querySelector('.modal-head h3')?.textContent).toContain('Cancelar sesión');
    expect(el.querySelector('.m-sub')?.textContent).toContain('7ma+8va · Cancha 1 · 18:00');
    expect(el.querySelector('.m-ic')?.classList.contains('danger')).toBe(true);
    expect(el.querySelector('.m-ic [data-testid="ic"]')).toBeTruthy();
    expect(el.querySelector('.modal-body [data-testid="body"]')).toBeTruthy();
    // El pie es hermano flex de head/body, no va dentro de .modal-body.
    expect(el.querySelector('.modal-body [data-testid="foot-btn"]')).toBeNull();
    expect(el.querySelector('dialog > .modal-foot [data-testid="foot-btn"]')).toBeTruthy();
  });

  it('aria-labelledby apunta al <h3> con un id único generado', () => {
    const { el } = mount();
    const dlg = el.querySelector('dialog')!;
    const id = dlg.getAttribute('aria-labelledby');
    expect(id).toBeTruthy();
    expect(el.querySelector('.modal-head h3')?.id).toBe(id);
  });

  it('sin subtítulo no renderiza .m-sub', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('title', 'Solo título');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.m-sub')).toBeNull();
  });

  it('acepta el icon primary y lo aplica como clase del .m-ic', async () => {
    // Ampliar el union NO alcanza: la regla .m-ic.primary tiene que existir en components.css o el
    // ícono sale sin estilo. strictTemplates caza la primera mitad; la segunda no la caza nadie.
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ModalComponent);
    fixture.componentRef.setInput('title', 'Tomar asistencia');
    fixture.componentRef.setInput('icon', 'primary');
    fixture.detectChanges();
    const ic = (fixture.nativeElement as HTMLElement).querySelector('.m-ic')!;
    expect(ic.classList.contains('primary')).toBe(true);
  });
});
