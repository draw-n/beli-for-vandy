import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

const redirectToLogin = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return router.createUrlTree(auth.isAuthenticated ? ['/locations'] : ['/login'], {
    queryParams: auth.isAuthenticated ? { reason: 'forbidden' } : undefined,
  });
};

export const moderatorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isModerator ? true : redirectToLogin();
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin ? true : redirectToLogin();
};
