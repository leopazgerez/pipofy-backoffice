import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BrandmarkComponent } from './brandmark.component';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [BrandmarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="site-footer">
      <div class="sf-inner">
        <div class="sf-top">
          <div>
            <app-brandmark />
            <p class="sf-blurb">
              Gestión de clubes de pádel y tenis: grupos, créditos, pagos y WhatsApp en un solo lugar.
            </p>
          </div>
          <div class="sf-ctas"><ng-content /></div>
        </div>
        <div class="sf-legal">
          <span>© 2026 SetPoint · Club Solaris</span>
          <nav aria-label="Enlaces del pie">
            <a href="#" (click)="$event.preventDefault()">Términos</a>
            <a href="#" (click)="$event.preventDefault()">Privacidad</a>
            <a href="#" (click)="$event.preventDefault()">Soporte</a>
          </nav>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooterComponent {}
