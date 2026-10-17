import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import type { LocationDetails } from '../types/location';
import { apiBaseUrl } from '../api/api-base-url';

import { Locations } from './locations';

describe('Locations', () => {
  let component: Locations;
  let fixture: ComponentFixture<Locations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Locations],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Locations);
    component = fixture.componentInstance;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${apiBaseUrl}/locations/`).flush([]);
    http.expectOne(`${apiBaseUrl}/reviews/`).flush([]);
    http.verify();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filters dining halls using the selected tag', () => {
    const hall = (uuid: string, tags: string[]): LocationDetails => ({
      uuid,
      name: uuid,
      location: '',
      tags,
      hours: [],
      averageRating: 0,
      reviewCount: 0,
      friendRating: null,
      photos: [],
      reviews: [],
    });
    component.locations.set([hall('late-night-hall', ['Late Night']), hall('other-hall', ['Coffee'])]);
    expect(component.filteredDiningHalls).toHaveLength(2);

    component.selectedTag = 'Late Night';

    expect(component.availableTags).toEqual(['Coffee', 'Late Night']);
    expect(component.filteredDiningHalls.map((location) => location.uuid)).toEqual([
      'late-night-hall',
    ]);
  });

  it('displays mapped covers and keeps the placeholder for an unmapped location', async () => {
    const http = TestBed.inject(HttpTestingController);
    const mappedFixture = TestBed.createComponent(Locations);
    http.expectOne('http://localhost:8000/locations/').flush([
      {
        uuid: '650408b4-bf68-11f1-a035-00155de17b17',
        name: 'The Commons Dining Center',
        address: 'Peabody Campus',
      },
      {
        uuid: '71497d48-bf68-11f1-b291-00155de17b17',
        name: 'Rand Dining Center',
        address: 'Rand Hall',
      },
      { uuid: 'unknown-location', name: 'New Dining Spot', address: 'Campus' },
    ]);
    http.expectOne('http://localhost:8000/reviews/').flush([]);

    mappedFixture.detectChanges();
    await mappedFixture.whenStable();

    const cards = mappedFixture.nativeElement.querySelectorAll('.dining-card');
    expect(cards[0].querySelector('img')?.getAttribute('src')).toBe('/assets/commons.jpg');
    expect(cards[1].querySelector('img')?.getAttribute('src')).toBe('/assets/rand.jpg');
    expect(cards[2].querySelector('img')).toBeNull();
    expect(cards[2].querySelector('.image-placeholder')).not.toBeNull();
    http.verify();
  });

  it('clears the bearer token and existing account login state on logout', () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'user-1' }));
    sessionStorage.setItem('accessToken', 'signed-token');
    component.logout();
    expect(sessionStorage.getItem('currentAccount')).toBeNull();
    expect(sessionStorage.getItem('accessToken')).toBeNull();
  });
});
