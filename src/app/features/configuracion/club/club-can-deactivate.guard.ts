import { CanDeactivateFn } from '@angular/router';
import { ClubPageComponent } from './club-page.component';

/**
 * Los tabs de Configuración son routerLink: cambiar de tab DESTRUYE este componente y con
 * él los seis signals. La facade sobrevive (vive en los providers de la ruta padre), así
 * que al volver el effect() re-siembra desde el servidor y lo tipeado desapareció.
 *
 * Las otras seis pantallas no necesitan esto: showModal() pone `inert` en el resto del
 * documento, o sea que con el modal abierto no se puede clickear un tab. El <dialog> las
 * protegía sin que nadie lo decidiera; acá hay que reponer la red a mano.
 *
 * confirm() nativo y no un modal propio: un guard de navegación tiene que poder ser
 * síncrono, y un <dialog> acá agregaría una máquina de estados para el único caso del
 * proyecto que la necesita.
 *
 * ponytail: confirm() nativo. Techo: si aparece un SEGUNDO formulario in-place, ahí se
 * piensa un modal compartido — no antes.
 */
export const clubCanDeactivate: CanDeactivateFn<ClubPageComponent> = (component) =>
  !component.dirty() || confirm('Tenés cambios sin guardar. ¿Salir igual?');
