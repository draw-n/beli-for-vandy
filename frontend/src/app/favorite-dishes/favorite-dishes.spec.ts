import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { apiBaseUrl } from '../api/api-base-url';
import { FavoriteDishesPage } from './favorite-dishes';

describe('FavoriteDishesPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FavoriteDishesPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'user-1' }));
    sessionStorage.setItem('accessToken', 'signed-token');
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.removeItem('currentAccount');
    sessionStorage.removeItem('accessToken');
  });

  it('shows saved dishes and removes one from the collection', () => {
    const fixture = TestBed.createComponent(FavoriteDishesPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const load = http.expectOne(`${apiBaseUrl}/favorite-dishes/`);
    expect(load.request.headers.get('Authorization')).toBe('Bearer signed-token');
    load.flush([{
      uuid: 'dish-1', name: 'Tacos', location_id: 'location-1', location_name: 'Commons',
      created_at: '2026-10-18T12:00:00Z',
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Tacos');
    expect(fixture.nativeElement.textContent).toContain('Commons');
    (fixture.nativeElement.querySelector('button[aria-label="Remove Tacos from favorite dishes"]') as HTMLButtonElement).click();
    const remove = http.expectOne(`${apiBaseUrl}/favorite-dishes/dish-1`);
    remove.flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No favorite dishes yet');
  });
});
