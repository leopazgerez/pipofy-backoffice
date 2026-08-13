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

/** La ruta la fija la API: el mail de reset linkea a `${FRONTEND_URL}/reset-password?token=…`. */
export const RESET_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reset-password-page.component').then((m) => m.ResetPasswordPageComponent),
  },
];

export const CHANGE_PASSWORD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/change-password-page.component').then((m) => m.ChangePasswordPageComponent),
  },
];

export const VERIFY_EMAIL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/verify-email-page.component').then((m) => m.VerifyEmailPageComponent),
  },
];
