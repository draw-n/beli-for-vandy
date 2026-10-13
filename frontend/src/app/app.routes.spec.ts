import { routes } from './app.routes';

describe('App routes', () => {
  it('should expose the application pages and fallback', () => {
    expect(routes.map((route) => route.path)).toEqual([
      '',
      'login',
      'register',
      'locations',
      'locations/:id',
      'profile',
      '**',
    ]);
  });
});
