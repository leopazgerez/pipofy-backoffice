import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-brandmark',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="brandmark" [routerLink]="link()" [attr.aria-label]="ariaLabel()">
      <span class="bm-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#fff" stroke-width="1.6" />
          <path d="M4 8c4 2 12 2 16 0M4 16c4-2 12-2 16 0" stroke="#4ADE80" stroke-width="1.6" />
        </svg>
      </span>
      <span><span class="bm-name">SetPoint</span><span class="bm-sub">Club Ops</span></span>
    </a>
  `,
})
export class BrandmarkComponent {
  readonly link = input<string>('/');
  readonly ariaLabel = input<string>('SetPoint · ir al panel');
}
