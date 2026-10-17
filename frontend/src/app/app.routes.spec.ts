import { routes } from './app.routes';

describe('App routes', () => {
  it('should configure the application routes', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  it('should redirect the default route to login', () => {
    const route = routes.find((route) => route.path === '');

    expect(route?.redirectTo).toBe('login');
  });

  it('should include the login route', () => {
    expect(routes.some((route) => route.path === 'login')).toBe(true);
  });

  it('should include the register route', () => {
    expect(routes.some((route) => route.path === 'register')).toBe(true);
  });

  it('should include the locations route', () => {
    expect(routes.some((route) => route.path === 'locations')).toBe(true);
  });

  it('should include the location profile route', () => {
    expect(routes.some((route) => route.path === 'locations/:id')).toBe(true);
  });

  it('should include the profile route', () => {
    expect(routes.some((route) => route.path === 'profile')).toBe(true);
  });

  it('should include the friends route', () => {
    expect(routes.some((route) => route.path === 'friends')).toBe(true);
  });

  it('should redirect unknown routes to login', () => {
    const route = routes.find((route) => route.path === '**');

    expect(route?.redirectTo).toBe('login');
  });
});
