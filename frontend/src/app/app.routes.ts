import { Routes } from '@angular/router';

import { LoginComponent } from './login/login.component';
import { Register } from './register/register';
import { DiningHalls } from './dining-halls/dining-halls';
import { DiningHallDetail } from './dining-hall-detail/dining-hall-detail';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'register',
    component: Register,
  },
  {
    path: 'dining-halls',
    component: DiningHalls,
  },
  {
    path: 'dining-halls/:id',
    component: DiningHallDetail,
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
