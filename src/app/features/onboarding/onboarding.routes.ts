import { Routes } from '@angular/router';
import { OnboardingFacade } from './onboarding.facade';
import { OnboardingPersistenceService } from './onboarding-persistence.service';

// Ya no hay ONBOARDING_PROVIDERS: AuthRepository se bindea en root (app.config.ts) porque
// el interceptor y el guard lo necesitan fuera de toda ruta lazy.
export const ONBOARDING_ROUTES: Routes = [
  {
    path: '',
    providers: [OnboardingFacade, OnboardingPersistenceService],
    loadComponent: () =>
      import('./pages/onboarding-wizard.component').then((m) => m.OnboardingWizardComponent),
  },
];
