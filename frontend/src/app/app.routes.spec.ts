import { routes } from './app.routes';
import { LoginComponent } from './login/login.component';

describe('App routes', () => {
  it('should have a login route', () => {
    const loginRoute = routes.find(route => route.path === 'login');

    expect(loginRoute).toBeTruthy();
    expect(loginRoute?.component).toBe(LoginComponent);
  });

  it('should redirect the root path to login', () => {
    const rootRoute = routes.find(route => route.path === '');

    expect(rootRoute).toBeTruthy();
    expect(rootRoute?.redirectTo).toBe('login');
    expect(rootRoute?.pathMatch).toBe('full');
  });
});