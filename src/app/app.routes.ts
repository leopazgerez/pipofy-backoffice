import { Routes } from '@angular/router';
import { authGuard } from './features/auth/auth.guard';

const enConstruccion = () =>
  import('@shared/ui/en-construccion.component').then((m) => m.EnConstruccionComponent);

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.LOGIN_ROUTES),
    data: { title: 'Iniciar sesión' },
  },
  {
    path: 'verify-email',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.VERIFY_EMAIL_ROUTES),
    data: { title: 'Verificar email' },
  },
  {
    path: 'revisa-tu-mail',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.VERIFICATION_SENT_ROUTES),
    data: { title: 'Revisá tu correo' },
  },
  // Público, SIN shell: wizard de onboarding (feature con providers propios).
  {
    path: 'onboarding',
    loadChildren: () => import('./features/onboarding/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
    data: { title: 'Crear cuenta' },
  },
  // App autenticada: el shell envuelve todo esto
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
        data: { title: 'Operaciones en tiempo real', crumb: 'Operación' },
      },
      { path: 'comercial',  loadComponent: enConstruccion, data: { title: 'Comercial y Pagos',     crumb: 'Comercial' } },
      {
        path: 'grupos',
        loadChildren: () => import('./features/grupos/grupos.routes').then((m) => m.GRUPOS_ROUTES),
        data: { title: 'Grupos y clases', crumb: 'Grupos' },
      },
      {
        path: 'alumnos',
        loadChildren: () => import('./features/alumnos/alumnos.routes').then((m) => m.ALUMNOS_ROUTES),
        data: { title: 'Alumnos y créditos', crumb: 'Alumnos' },
      },
      { path: 'plantillas', loadComponent: enConstruccion, data: { title: 'Plantillas y WhatsApp', crumb: 'Plantillas' } },
      {
        path: 'configuracion',
        loadChildren: () =>
          import('./features/configuracion/configuracion.routes').then((m) => m.CONFIGURACION_ROUTES),
        data: { title: 'Configuración del club', crumb: 'Gestión' },
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];
