import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-en-construccion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ec">
      <div class="ec-icon" aria-hidden="true">🚧</div>
      <h2>{{ title }}</h2>
      <p>Esta sección todavía está en construcción.</p>
    </div>
  `,
  styles: [`
    .ec{max-width:480px;margin:var(--space-3xl) auto;text-align:center;padding:var(--space-lg)}
    .ec-icon{font-size:44px;margin-bottom:var(--space-md)}
    .ec h2{font-size:var(--text-xl);margin-bottom:var(--space-sm)}
    .ec p{color:var(--color-fg-muted);font-size:var(--text-sm)}
  `],
})
export class EnConstruccionComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title: string =
    (this.route.snapshot.data['title'] as string | undefined) ?? 'En construcción';
}
