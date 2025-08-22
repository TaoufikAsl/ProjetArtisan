import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

type Role = 'Artisan' | 'Client' | 'DeliveryPartner' | 'Admin';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  const required = route.data?.['role'] as Role | undefined;
  if (required && auth.getRole() !== required) {
    router.navigate(['/forbidden']);
    return false;
  }
  return true;
};
