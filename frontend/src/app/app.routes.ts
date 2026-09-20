import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'account',
    loadComponent: () =>
      import('./account/account-page').then((component) => component.AccountPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login-page').then((component) => component.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup-page').then((component) => component.SignupPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'account' },
  { path: '**', redirectTo: 'account' },
];
