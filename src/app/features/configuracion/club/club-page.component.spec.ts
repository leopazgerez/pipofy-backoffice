import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ClubPageComponent } from './club-page.component';
import { ClubFacade } from './club.facade';
import { ClubRepository } from '@domain/contracts/club.repository';
import { Club, ClubDraft } from '@domain/entities/club';
import { ToastService } from '@shared/ui/toast/toast.service';

const CLUB: Club = {
  id: '1', name: 'Club Central', phone: '1155667788', address: 'Siempreviva 742',
  usesLeveling: true, holdMinutes: 30, transferAlias: 'alias.mp', active: true,
};

function setup(repo: Partial<ClubRepository>) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: ClubRepository, useValue: repo },
      ClubFacade,
      ToastService,
    ],
  });
  const fixture = TestBed.createComponent(ClubPageComponent);
  fixture.detectChanges();
  return fixture;
}

const el = (f: { nativeElement: HTMLElement }, sel: string) =>
  f.nativeElement.querySelector(sel) as HTMLInputElement;

describe('ClubPageComponent', () => {
  it('precarga los seis campos cuando el club llega', async () => {
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    expect(el(f, '#club-nombre').value).toBe('Club Central');
    expect(el(f, '#club-telefono').value).toBe('1155667788');
    expect(el(f, '#club-direccion').value).toBe('Siempreviva 742');
    expect(el(f, '#club-alias').value).toBe('alias.mp');
    expect(el(f, '#club-minutos').value).toBe('30');
    expect(el(f, '#club-niveles').checked).toBe(true);
  });

  it('los nullables en null llegan al formulario como cadena vacía', async () => {
    const f = setup({ get: async () => ({ ...CLUB, phone: null, address: null, transferAlias: null }) });
    await f.whenStable();
    f.detectChanges();
    expect(el(f, '#club-telefono').value).toBe('');
    expect(el(f, '#club-direccion').value).toBe('');
    expect(el(f, '#club-alias').value).toBe('');
  });

  it('con la carga FALLADA no hay formulario en el DOM', async () => {
    // Es el test que impide el borrado silencioso de tres campos: un formulario vacío y
    // editable sobre data() en null manda phone/address/transferAlias en null, y en esta
    // entidad el null vacía de verdad (§3.8, §8.1).
    const f = setup({ get: async () => { throw { kind: 'network' }; } });
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('#club-nombre')).toBeNull();
    expect(f.nativeElement.querySelector('[data-test="save"]')).toBeNull();
    expect(f.nativeElement.querySelector('[data-test="retry"]')).toBeTruthy();
  });

  it('el banner de error queda FUERA de la cadena: se ve junto al formulario', async () => {
    // Regla 1 de §8.0. Un error de guardado no puede reemplazar lo que la persona escribió.
    //
    // ponytail-deviation del brief: la versión del brief hacía un primer click ANTES de
    // tocar ningún campo, para dejar `primera` en false y que el segundo click fallara.
    // Pero Guardar arranca [disabled] (dirty() en false) y jsdom, igual que un browser
    // real, NO dispara 'click' en un <button disabled> — lo verifiqué con un botón nativo
    // fuera de Angular. Ese primer click nunca llamaba a update(), así que `primera` seguía
    // en true y el ÚNICO update() real (el del segundo click) entraba por la rama que NO
    // tira. El test nunca alcanzaba el banner. Un solo click, después de editar un campo
    // (para que Guardar esté habilitado), con update() fallando siempre, prueba lo mismo
    // que dice el nombre del test sin depender de esa carrera.
    const f = setup({
      get: async () => CLUB,
      update: async () => { throw { kind: 'network' }; },
    });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-nombre').value = 'Otro';
    el(f, '#club-nombre').dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.notice')).toBeTruthy();
    expect(f.nativeElement.querySelector('#club-nombre')).toBeTruthy();
  });

  it('guardar NO reemplaza el formulario por "Cargando…": data() manda antes que loading()', async () => {
    // Regresión del code review, fix round 1: el chain preguntaba por loading() primero, y
    // loading es compartido entre lectura y escritura. Con el club ya cargado, cada click
    // en Guardar (loading=true, data() todavía no-null) tiraba abajo los 6 <input> del DOM
    // y los reemplazaba por el texto de una LECTURA — perdiendo además el foco. Se dispara
    // el guardado contra un update() que queda pendiente a propósito, para inspeccionar el
    // DOM en el medio del guardado, mientras loading() es true y data() sigue en pie.
    let resolveUpdate!: () => void;
    const pending = new Promise<void>((resolve) => { resolveUpdate = resolve; });
    const f = setup({ get: async () => CLUB, update: () => pending });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-nombre').value = 'Otro';
    el(f, '#club-nombre').dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Cargando los datos del club');
    expect(el(f, '#club-nombre')).toBeTruthy();
    expect(el(f, '#club-nombre').value).toBe('Otro');
    resolveUpdate();
    await f.whenStable();
  });

  it('Guardar arranca deshabilitado: sin cambios no hay nada que mandar', async () => {
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    const save = f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('tocar un campo habilita Guardar y prende dirty()', async () => {
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-nombre').value = 'Club Nuevo';
    el(f, '#club-nombre').dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(f.componentInstance.dirty()).toBe(true);
    expect((f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).disabled).toBe(false);
  });

  it('volver al valor original apaga dirty(): no manda un PATCH que no cambia nada', async () => {
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-nombre').value = 'Otro';
    el(f, '#club-nombre').dispatchEvent(new Event('input'));
    f.detectChanges();
    el(f, '#club-nombre').value = 'Club Central';
    el(f, '#club-nombre').dispatchEvent(new Event('input'));
    f.detectChanges();
    expect(f.componentInstance.dirty()).toBe(false);
  });

  it('el checkbox cuenta para dirty()', async () => {
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-niveles').checked = false;
    el(f, '#club-niveles').dispatchEvent(new Event('change'));
    f.detectChanges();
    expect(f.componentInstance.dirty()).toBe(true);
  });

  it('guardar manda el draft y vuelve a dejar dirty() en false', async () => {
    const enviados: ClubDraft[] = [];
    const f = setup({
      get: async () => CLUB,
      update: async (d) => { enviados.push(d); },
    });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-minutos').value = '45';
    el(f, '#club-minutos').dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
    await f.whenStable();
    f.detectChanges();
    expect(enviados[0].holdMinutes).toBe(45);
    // El repo devuelve CLUB (holdMinutes 30) y el effect re-siembra: dirty vuelve a false.
    expect(f.componentInstance.dirty()).toBe(false);
  });

  it('el checkbox usa el primitivo del design system, no un .field', async () => {
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.field #club-niveles')).toBeNull();
    expect(f.nativeElement.querySelector('.checkbox-row #club-niveles')).toBeTruthy();
  });

  it('NO usa autofocus: no hay dialog y esta es la pantalla por defecto de /configuracion', async () => {
    // §8.1: el patrón de autofocus existe sólo por showModal(); acá abriría el teclado
    // virtual cada vez que alguien entra a Configuración.
    const f = setup({ get: async () => CLUB });
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[autofocus]')).toBeNull();
  });

  it('reconstruir la página con data() poblado y error() de un guardado viejo NO lo reaparece', async () => {
    // Regresión del code review, fix round 1 de Task 6: la facade se provee en la ruta PADRE
    // (sobrevive al cambio de tab). Si save() falla y el usuario navega a otra tab y vuelve, el
    // componente se reconstruye con data() YA poblado — el `if (!data() && ...) load()` del
    // constructor no vuelve a correr, así que sin clearError() el banner de un guardado viejo
    // reaparecería sobre un formulario que está perfectamente bien.
    const f = setup({
      get: async () => CLUB,
      update: async () => { throw { kind: 'network' }; },
    });
    await f.whenStable();
    f.detectChanges();
    el(f, '#club-nombre').value = 'Otro';
    el(f, '#club-nombre').dispatchEvent(new Event('input'));
    f.detectChanges();
    (f.nativeElement.querySelector('[data-test="save"]') as HTMLButtonElement).click();
    await f.whenStable();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.notice')).toBeTruthy(); // sanity: el guardado falló

    // "Cambiar de tab y volver": la facade (providers del TestBed, como en la ruta padre real)
    // sobrevive; sólo se recrea el componente.
    const f2 = TestBed.createComponent(ClubPageComponent);
    f2.detectChanges();
    expect(f2.nativeElement.querySelector('.notice')).toBeNull();
  });
});
