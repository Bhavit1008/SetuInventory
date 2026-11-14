import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

export const CatalogueGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);

  if (auth.canAccessCatalogue()) return true;

  router.navigate(['/search']);
  return false;
};
