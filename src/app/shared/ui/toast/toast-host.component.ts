import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Host único del stack de toasts. Va montado en el SHELL, no en app.ts:
 *  · el shell redefine la escala tipográfica más densa en su :host, así que un
 *    host montado afuera pintaría los toasts con OTRA escala que el resto de la
 *    app autenticada;
 *  · onboarding no usa toasts hoy → montarlo en la raíz para cubrirlo es
 *    especulativo.
 * Ver el spec §3.2 y la decisión 9.
 *
 * Sin CSS propio: `.toasts`/`.toast*` viven en styles/components.css.
 */
@Component({
  selector: 'app-toast-host',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toasts" role="status" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast {{ t.type }}" [class.out]="t.leaving">
          <span class="t-ic" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              @if (t.type === 'ok') {
                <path d="M5 12l5 5 9-11" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
              } @else {
                <path d="M12 8v5M12 16v.01" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>
              }
            </svg>
          </span>
          <div>
            <div class="t-t">{{ t.title }}</div>
            <div class="t-d">{{ t.desc }}</div>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  protected readonly toasts = inject(ToastService);
}
