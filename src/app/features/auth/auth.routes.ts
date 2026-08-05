import { Routes } from '@angular/router';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/login-page.component').then((m) => m.LoginPageComponent),
  },
];

export const VERIFICATION_SENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/verification-sent-page.component').then((m) => m.VerificationSentPageComponent),
  },
];

export const VERIFY_EMAIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/verify-email-page.component').then((m) => m.VerifyEmailPageComponent),
  },
];
