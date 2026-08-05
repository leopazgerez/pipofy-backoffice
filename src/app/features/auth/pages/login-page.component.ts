import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BrandmarkComponent } from '@shared/ui/brandmark.component';
import { domainErrorMessage } from '@domain/errors';
import { AuthRepository } from '@domain/contracts/auth.repository';
import { EMAIL_RE } from '@shared/validators/email';
import { SessionFacade } from '../session.facade';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BrandmarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <header class="masthead"><app-brandmark link="/" /></header>

      <form class="card" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="step-head">
          <h2>Iniciá sesión</h2>
          <p>Entrá con la cuenta de tu club.</p>
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input id="email" type="email" inputmode="email" formControlName="email"
                 autocomplete="email" autocapitalize="off" spellcheck="false"
                 placeholder="martin@clubsolaris.com" />
        </div>

        <div class="field">
          <label for="password">Contraseña</label>
          <input id="password" type="password" formControlName="password"
                 autocomplete="current-password" placeholder="Tu contraseña" />
        </div>

        @if (message(); as msg) {
          <p class="error" role="alert">{{ msg }}</p>
        }

        @if (facade.error()?.kind === 'email-not-verified') {
          <button type="button" class="btn btn-ghost" (click)="resend()">
            Reenviar mail de verificación
          </button>
        }

        <button type="submit" class="btn btn-cta" [disabled]="facade.loading()">
          {{ facade.loading() ? 'Entrando…' : 'Entrar' }}
        </button>

        <p class="legal">¿No tenés cuenta? <a routerLink="/onboarding">Creá una</a></p>
      </form>
    </main>
  `,
  styles: [`
    .page{max-width:420px;margin:0 auto;padding:var(--space-lg) var(--space-md)}
    .masthead{margin-bottom:var(--space-lg)}
    .card{display:flex;flex-direction:column;gap:var(--space-md);padding:var(--space-lg);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface)}
    .step-head h2{font-size:var(--text-xl)}
    .step-head p{font-size:var(--text-sm);color:var(--color-fg-muted);margin-top:var(--space-xs)}
    .field{display:flex;flex-direction:column;gap:var(--space-xs)}
    .field label{font-size:var(--text-sm);font-weight:600}
    .field input{padding:12px var(--space-md);border:1.5px solid var(--color-border-strong);border-radius:var(--radius-sm);background:var(--color-surface);font-size:var(--text-md)}
    .field input:focus-visible{outline:2.5px solid var(--color-ring);outline-offset:2px}
    .error{font-size:var(--text-sm);color:var(--color-destructive);font-weight:600}
    .legal{font-size:var(--text-sm);color:var(--color-fg-muted);text-align:center}
    .legal a{color:var(--color-primary);font-weight:600}
  `],
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthRepository);
  protected readonly facade = inject(SessionFacade);

  protected readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.pattern(EMAIL_RE)]),
    password: this.fb.control('', [Validators.required]),
  });

  private readonly localError = signal('');

  protected readonly message = computed(() => {
    const local = this.localError();
    if (local) return local;
    const err = this.facade.error();
    return err ? domainErrorMessage(err) : '';
  });

  protected async onSubmit(): Promise<void> {
    this.localError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.localError.set('Completá email y contraseña.');
      return;
    }
    const { email, password } = this.form.getRawValue();
    await this.facade.login(email ?? '', password ?? '');
    if (this.facade.error()) return;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
    // returnUrl viene de la query string: puede apuntar a una ruta que no existe.
    // navigateByUrl() rechaza con NG04002 en ese caso — sin manejarlo queda como unhandled
    // rejection y el usuario, ya logueado, se queda sin feedback en el form de login.
    await this.router.navigateByUrl(returnUrl)
      .catch((e) => console.error('[auth] redirect post-login falló', e));
  }

  protected async resend(): Promise<void> {
    const email = this.form.getRawValue().email ?? '';
    try {
      await this.auth.resendVerification(email);
    } catch {
      // La pantalla de destino explica el estado; un fallo de red acá no debe bloquear.
    }
    // El pedido de reenvío ya salió (o falló y se ignoró arriba): lo que sigue es sólo el
    // redirect. navigate() puede rechazar por motivos ajenos a que la ruta no exista todavía
    // (falla al cargar un chunk lazy, un guard que tira) — sin manejar el rechazo queda como
    // unhandled rejection y no cambia nada más para el usuario, que ya recibió su reenvío.
    await this.router.navigate(['/revisa-tu-mail'], { queryParams: { email } })
      .catch((e) => console.error('[auth] redirect a /revisa-tu-mail falló', e));
  }
}
