import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { apiBaseUrl } from '../api/api-base-url';
import { FriendFeed } from './friend-feed';

const review = {
  uuid: 'review-1',
  user_id: 'user-1',
  location_id: 'location-1',
  rating: 9,
  note: 'Great meal',
  meal_type: 'Lunch',
  created_at: '2026-10-18T12:00:00Z',
  updated_at: '2026-10-18T12:00:00Z',
  photo_ids: [],
  favorite_dishes: [],
};

describe('FriendFeed', () => {
  let fixture: ComponentFixture<FriendFeed>;
  let component: FriendFeed;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FriendFeed],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(FriendFeed);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  function flushFeed(
    reviews = [review],
    hasMore = false,
    page = 1,
  ): void {
    const feedRequest = http.expectOne(`${apiBaseUrl}/reviews/friend-feed?page=${page}`);
    feedRequest.flush({ reviews, has_more: hasMore });
  }

  it('loads and maps reviews with author and location names', () => {
    fixture.detectChanges();
    flushFeed();

    const accountsRequest = http.expectOne(`${apiBaseUrl}/accounts/public`);
    accountsRequest.flush([
      {
        uuid: 'user-1',
        first_name: 'Elle',
        last_name: 'Liu',
        username: 'elle',
        year_graduation: 2027,
        type: 'student',
      },
    ]);

    const locationRequest = http.expectOne(`${apiBaseUrl}/locations/location-1`);
    locationRequest.flush({
      uuid: 'location-1',
      name: 'The Commons',
      address: 'Campus',
    });
    fixture.detectChanges();

    expect(component.reviews[0].createdAt).toEqual(new Date(review.created_at));
    expect(component.authorNames['user-1']).toBe('Elle Liu');
    expect(component.locationNames['location-1']).toBe('The Commons');
    expect(component.loading).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Elle Liu');
  });

  it('loads the next page only when more reviews are available', () => {
    fixture.detectChanges();
    flushFeed([], true);
    http.expectOne(`${apiBaseUrl}/accounts/public`).flush([]);
    fixture.detectChanges();

    component.goToPage(2);
    flushFeed([], false, 2);
    http.expectOne(`${apiBaseUrl}/accounts/public`).flush([]);
    fixture.detectChanges();

    expect(component.page).toBe(2);
    expect(component.hasMore).toBe(false);
    component.goToPage(3);
    expect(http.match(`${apiBaseUrl}/reviews/friend-feed?page=3`)).toHaveLength(0);
  });

  it('shows the empty state when the feed has no reviews', () => {
    fixture.detectChanges();
    flushFeed([]);
    http.expectOne(`${apiBaseUrl}/accounts/public`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No friend reviews yet');
    expect(component.loading).toBe(false);
  });

  it('shows an error and supports retrying the failed request', () => {
    fixture.detectChanges();
    const request = http.expectOne(`${apiBaseUrl}/reviews/friend-feed?page=1`);
    request.flush({ detail: 'Unavailable' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(component.errorMessage).toBe('Could not load your friend feed.');
    expect(fixture.nativeElement.textContent).toContain('Could not load your friend feed.');

    component.loadPage(1);
    flushFeed([]);
    http.expectOne(`${apiBaseUrl}/accounts/public`).flush([]);
    fixture.detectChanges();
    expect(component.errorMessage).toBe('');
  });

  it('does not render a duplicate friends navigation button', () => {
    fixture.detectChanges();
    flushFeed([]);
    http.expectOne(`${apiBaseUrl}/accounts/public`).flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.header-actions [routerLink="/friends"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.page-header > button')).toBeNull();
  });
});
