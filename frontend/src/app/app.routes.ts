import { Routes } from '@angular/router';
import { DiningHalls } from './dining-halls/dining-halls';
import { DiningHallDetail } from './dining-hall-detail/dining-hall-detail';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dining-halls',
    pathMatch: 'full',
  },
  {
    path: 'dining-halls',
    component: DiningHalls,
  },
  {
    path: 'dining-halls/:id',
    component: DiningHallDetail,
  },
];
