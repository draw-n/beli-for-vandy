import { routes } from './app.routes';

describe('App routes', () => {
  it('should leave page routing unconfigured', () => {
    expect(routes).toEqual([]);
  });
});
