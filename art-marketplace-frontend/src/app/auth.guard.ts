import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

// Exige simplement d'être connecté
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }
  return true;
};

// Interdit l'accès si déjà connecté (ex: login/register)
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
