import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ConfigTab {
  readonly label: string;
  readonly path: string;
}

/**
 * Contenedor de la sección: sólo la sub-navegación y el outlet. Un item de sidebar con
 * tabs adentro, y no nueve items sueltos: las entidades configurables llegan a nueve y la
 * sidebar dejaría de ser navegación para ser un índice.
 *
 * PARA AGREGAR UNA ENTIDAD: sumar su entrada acá Y su child route en configuracion.routes.ts.
 */
@Component({
  selector: 'app-configuracion-page',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-page.component.html',
  styleUrl: './configuracion-page.component.css',
})
export class ConfiguracionPageComponent {
  protected readonly tabs: readonly ConfigTab[] = [
    { label: 'Club', path: 'club' },
    { label: 'Canchas', path: 'canchas' },
    { label: 'Categorías', path: 'categorias' },
    { label: 'Grupos de categoría', path: 'grupos-categoria' },
    { label: 'Planes', path: 'planes' },
    { label: 'Profesores', path: 'profesores' },
    { label: 'Horarios', path: 'horarios' },
  ];
}
