import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiBaseUrl } from './api-base-url';
import { FavoriteDishApi } from './favorite-dish.api';

describe('FavoriteDishApi', () => {
  let api: FavoriteDishApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(FavoriteDishApi);
    http = TestBed.inject(HttpTestingController);
    sessionStorage.setItem('accessToken', 'favorite-token');
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem('accessToken');
  });

  it('loads, adds, and removes favorite dishes with bearer authentication', () => {
    api.getAll().subscribe();
    const get = http.expectOne(`${apiBaseUrl}/favorite-dishes/`);
    expect(get.request.headers.get('Authorization')).toBe('Bearer favorite-token');
    get.flush([]);

    api.add('Tacos', 'location-1', 'Commons').subscribe();
    const post = http.expectOne(`${apiBaseUrl}/favorite-dishes/`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({
      name: 'Tacos',
      location_id: 'location-1',
      location_name: 'Commons',
    });
    expect(post.request.headers.get('Authorization')).toBe('Bearer favorite-token');
    post.flush({ uuid: 'dish-1', name: 'Tacos', created_at: '2026-10-18T12:00:00Z' });

    api.remove('dish/1').subscribe();
    const remove = http.expectOne(`${apiBaseUrl}/favorite-dishes/dish%2F1`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.headers.get('Authorization')).toBe('Bearer favorite-token');
    remove.flush(null);
  });
});
