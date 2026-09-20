import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'account',
    loadComponent: () =>
      import('./account/account-page').then((component) => component.AccountPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'account' },
  { path: '**', redirectTo: 'account' },
];
