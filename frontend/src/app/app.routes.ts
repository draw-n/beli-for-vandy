import { Routes } from '@angular/router';

import { LoginComponent } from './login/login';
import { Register } from './register/register';
import { Locations } from './locations/locations';
import { LocationProfile} from './location-profile/location-profile';
import { Profile } from './user-profile/user-profile';

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
    path: 'locations',
    component: Locations,
  },
  {
    path: 'locations/:id',
    component: LocationProfile,
  },
  {
    path: 'profile',
    component: Profile,
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
