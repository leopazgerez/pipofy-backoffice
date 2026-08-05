import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrandmarkComponent } from '@shared/ui/brandmark.component';
import { domainErrorMessage } from '@domain/errors';
import { EMAIL_RE } from '@shared/validators/email';
import { VerificationFacade } from '../verification.facade';

const COOLDOWN_MS = 60_000;

@Component({
  selector: 'app-verification-sent-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, BrandmarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="page">
      <header class="masthead"><app-brandmark link="/" /></header>

      <section class="card">
        <div class="badge" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M3 7l9 6 9-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8" /></svg>
        </div>
        <h2>Revisá tu correo</h2>

        @if (email()) {
          <p>Te mandamos un link de verificación a <b>{{ email() }}</b>. Abrilo para activar tu cuenta.</p>
          @if (prefilledInvalid()) {
            <p class="field-err" role="alert">Ingresá un email válido.</p>
          }
        } @else {
          <p>Ingresá tu email y te reenviamos el link de verificación.</p>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" type="email" inputmode="email" [formControl]="emailCtrl"
                   autocapitalize="off" spellcheck="false" placeholder="martin@clubsolaris.com" />
            @if (emailCtrl.invalid && emailCtrl.touched) {
              <p class="field-err" role="alert">Ingresá un email válido.</p>
            }
          </div>
        }

        @if (facade.sent()) {
          <p class="ok" role="status">Si ese email está registrado, te reenviamos el link.</p>
        }
        @if (facade.error(); as err) {
          <p class="error" role="alert">{{ domainErrorMessage(err) }}</p>
        }

        <button type="button" class="btn btn-ghost" [disabled]="facade.loading() || cooldown()"
                (click)="resend()">
          {{ cooldown() ? 'Reenviar (esperá un momento)' : 'Reenviar mail' }}
        </button>

        <a class="btn btn-cta" routerLink="/login">Ir a iniciar sesión</a>
      </section>
    </main>
  `,
  styles: [`
    .page{max-width:420px;margin:0 auto;padding:var(--space-lg) var(--space-md)}
    .masthead{margin-bottom:var(--space-lg)}
    .card{display:flex;flex-direction:column;gap:var(--space-md);padding:var(--space-lg);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);text-align:center}
    .badge{width:56px;height:56px;margin:0 auto;border-radius:50%;display:grid;place-items:center;background:var(--color-primary-soft);color:var(--color-on-primary-soft)}
    .badge svg{width:28px;height:28px}
    .card h2{font-size:var(--text-xl)}
    .card p{font-size:var(--text-sm);color:var(--color-fg-muted)}
    .field{display:flex;flex-direction:column;gap:var(--space-xs);text-align:left}
    .field label{font-size:var(--text-sm);font-weight:600}
    .field input{padding:12px var(--space-md);border:1.5px solid var(--color-border-strong);border-radius:var(--radius-sm);background:var(--color-surface);font-size:var(--text-md)}
    .ok{color:var(--color-accent-strong);font-weight:600}
    .error{color:var(--color-destructive);font-weight:600}
    .field-err{font-size:var(--text-xs);color:var(--color-destructive);font-weight:600;margin-top:2px}
  `],
  providers: [VerificationFacade],
})
export class VerificationSentPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(VerificationFacade);
  protected readonly domainErrorMessage = domainErrorMessage;

  protected readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  protected readonly emailCtrl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(EMAIL_RE)],
  });
  protected readonly prefilledInvalid = signal(false);

  // ponytail: cooldown SOLO client-side, para que un click nervioso no genere 5 mails
  // idénticos. El rate limit de verdad le corresponde al backend.
  protected readonly cooldown = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected async resend(): Promise<void> {
    const prefilled = this.email();
    const target = prefilled || this.emailCtrl.value.trim();
    // El email prefilled viene de queryParamMap (query param editable a mano, ej.
    // /revisa-tu-mail?email=<lo que sea>), no de algo que la app garantice: se valida con el
    // mismo EMAIL_RE que el campo tipeado, no se asume que "vino del signup".
    if (!EMAIL_RE.test(target)) {
      this.emailCtrl.markAsTouched();
      this.prefilledInvalid.set(true);
      return;
    }
    this.prefilledInvalid.set(false);
    await this.facade.resend(target);
    if (this.facade.error()) return;
    this.cooldown.set(true);
    this.timer = setTimeout(() => this.cooldown.set(false), COOLDOWN_MS);
  }

  ngOnDestroy(): void {
    if (this.timer !== null) clearTimeout(this.timer);
  }
}
