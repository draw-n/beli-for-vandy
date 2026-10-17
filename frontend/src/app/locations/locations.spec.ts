import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
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
});
