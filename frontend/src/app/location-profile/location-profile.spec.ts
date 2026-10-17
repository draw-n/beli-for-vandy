import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LocationProfile } from './location-profile';

describe('Location review ownership menu', () => {
  afterEach(() => sessionStorage.removeItem('currentAccount'));

  it('shows the three-dot menu only on the signed-in user’s review', async () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'me' }));

    TestBed.configureTestingModule({
      imports: [LocationProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'hall' }),
            },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LocationProfile);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/hall').flush({
      uuid: 'hall',
      name: 'Commons',
      address: 'Campus',
    });

    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush(
      ['me', 'someone-else'].map((user, index) => ({
        uuid: user,
        user_id: user,
        location_id: 'hall',
        rating: index === 0 ? 8 : 10,
        note: user === 'me' ? 'Breakfast review' : 'Dinner review',
        meal_type: user === 'me' ? 'Breakfast' : 'Dinner',
        created_at: user === 'me' ? '2026-01-01' : '2026-01-02',
        updated_at: user === 'me' ? '2026-01-01' : '2026-01-02',
      }))
    );

    http.expectOne('http://localhost:8000/accounts').flush([
      { uuid: 'me' },
      { uuid: 'someone-else' },
    ]);
    http.expectOne('http://localhost:8000/follows/').flush([]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[aria-label="Options for your review"]'
      ).length
    ).toBe(1);

    const component = fixture.componentInstance;
    expect(component.filteredReviews.length).toBe(2);
    expect(component.filteredReviews.map(review => review.userId)).toEqual(['someone-else', 'me']);
    component.selectedMealFilter = 'Breakfast';
    expect(component.filteredReviews.map(review => review.mealType)).toEqual(['Breakfast']);
    component.selectedMealFilter = 'Lunch';
    expect(component.filteredReviews).toEqual([]);
    component.selectedMealFilter = 'All';
    expect(component.hall!.reviewCount).toBe(2);
    expect(component.hall!.averageRating).toBe(9);
    expect(component.hall!.friendRating).toBeNull();
    expect(component.ratingDistribution.map(({ count }) => count)).toEqual([
      0, 0, 0, 1, 1,
    ]);
    expect(component.ratingDistribution.map(({ percentage }) => percentage)).toEqual([
      0, 0, 0, 50, 50,
    ]);
    const ownReview = component.hall!.reviews.find(review => review.userId === 'me')!;
    const otherReview = component.hall!.reviews.find(review => review.userId === 'someone-else')!;
    component.deleteReview(otherReview);
    http.expectNone(request => request.method === 'DELETE');

    component.deleteReview(ownReview);
    component.deleteReview(ownReview);

    http
      .expectOne('http://localhost:8000/reviews/me')
      .flush({}, { status: 500, statusText: 'Error' });

    expect(component.hall!.reviews.length).toBe(2);
    expect(component.reviewError()).toContain('Please try again');
    expect(component.deletingId()).toBeNull();

    component.deleteReview(ownReview);

    const deletion = http.expectOne(
      'http://localhost:8000/reviews/me'
    );

    expect(deletion.request.method).toBe('DELETE');

    deletion.flush({
      message: 'Review deleted successfully',
    });

    expect(component.hall!.reviews.map(review => review.userId)).toEqual([
      'someone-else',
    ]);
    expect(component.hall!.reviewCount).toBe(1);
    expect(component.hall!.averageRating).toBe(10);
    expect(component.ratingDistribution.map(({ count }) => count)).toEqual([
      0, 0, 0, 0, 1,
    ]);

    sessionStorage.removeItem('currentAccount');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll(
        '[aria-label="Options for your review"]'
      ).length
    ).toBe(0);

    http.verify();
  });

  it('returns zeroed rating buckets when there are no reviews', async () => {
    TestBed.configureTestingModule({
      imports: [LocationProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'hall' }) },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LocationProfile);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/hall').flush({
      uuid: 'hall',
      name: 'Commons',
      address: 'Campus',
    });
    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush([]);
    http.expectOne('http://localhost:8000/accounts').flush([]);

    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance;
    expect(component.hall!.averageRating).toBe(0);
    expect(component.hall!.reviewCount).toBe(0);
    expect(component.ratingDistribution.every(({ count, percentage }) =>
      count === 0 && percentage === 0
    )).toBe(true);
    http.expectNone('http://localhost:8000/follows/');
    expect(fixture.nativeElement.textContent).toContain('No reviews yet');
    expect(fixture.nativeElement.textContent).toContain('—');
    expect(fixture.nativeElement.querySelectorAll('.rating-row').length).toBe(0);

    const refreshReviews = component as unknown as {
      loadReviews: (locationId: string) => void;
    };
    refreshReviews.loadReviews('hall');
    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush(
      [2, 6].map((rating, index) => ({
        uuid: `review-${index}`,
        user_id: `user-${index}`,
        location_id: 'hall',
        rating,
        note: 'Review',
        meal_type: 'Lunch',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }))
    );
    expect(component.hall!.reviewCount).toBe(2);
    expect(component.hall!.averageRating).toBe(4);
    expect(component.ratingDistribution.map(({ count }) => count)).toEqual([
      1, 0, 1, 0, 0,
    ]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('4.0');
    expect(fixture.nativeElement.querySelectorAll('.rating-row').length).toBe(5);
    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="1 reviews rated 1–2 out of 10"]'
      )
    ).not.toBeNull();
    http.verify();
  });

  it('averages reviews from followed users, including mutual and one-way follows', async () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'me' }));
    TestBed.configureTestingModule({
      imports: [LocationProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'hall' }) },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LocationProfile);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/hall').flush({
      uuid: 'hall',
      name: 'Commons',
      address: 'Campus',
    });
    const reviewsRequest = http.expectOne(
      'http://localhost:8000/reviews/?location_id=hall'
    );
    reviewsRequest.flush(
      [
        { user: 'me', rating: 1 },
        { user: 'mutual', rating: 9 },
        { user: 'one-way', rating: 10 },
        { user: 'stranger', rating: 2 },
      ].map(({ user, rating }) => ({
        uuid: `review-${user}`,
        user_id: user,
        location_id: 'hall',
        rating,
        note: 'Review',
        meal_type: 'Lunch',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }))
    );
    http.expectOne('http://localhost:8000/accounts').flush([]);
    http.expectOne('http://localhost:8000/follows/').flush([
      {
        uuid: 'follow-mutual',
        from_user_id: 'me',
        to_user_id: 'mutual',
        is_mutual: true,
        created_at: '2026-01-01',
      },
      {
        uuid: 'follow-one-way',
        from_user_id: 'me',
        to_user_id: 'one-way',
        is_mutual: false,
        created_at: '2026-01-01',
      },
      {
        uuid: 'follow-incoming',
        from_user_id: 'stranger',
        to_user_id: 'me',
        is_mutual: false,
        created_at: '2026-01-01',
      },
    ]);

    const component = fixture.componentInstance;
    expect(component.hall!.friendRating).toBe(9.5);

    const refreshReviews = component as unknown as {
      loadReviews: (locationId: string) => void;
    };
    refreshReviews.loadReviews('hall');
    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush([
      {
        uuid: 'review-mutual',
        user_id: 'mutual',
        location_id: 'hall',
        rating: 7,
        note: 'Updated review set',
        meal_type: 'Lunch',
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      },
      {
        uuid: 'review-one-way',
        user_id: 'one-way',
        location_id: 'hall',
        rating: 9,
        note: 'Review',
        meal_type: 'Lunch',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);
    expect(component.hall!.friendRating).toBe(8);
    http.verify();
  });

  it('keeps Friends rating unavailable when follows fail or login data is malformed', async () => {
    sessionStorage.setItem('currentAccount', '{bad json');
    TestBed.configureTestingModule({
      imports: [LocationProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'hall' }) },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LocationProfile);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/hall').flush({
      uuid: 'hall',
      name: 'Commons',
      address: 'Campus',
    });
    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush([]);
    http.expectOne('http://localhost:8000/accounts').flush([]);
    http.expectNone('http://localhost:8000/follows/');
    expect(fixture.componentInstance.hall!.friendRating).toBeNull();
    http.verify();
  });

  it('keeps the location page usable when the follows request fails', async () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'me' }));
    TestBed.configureTestingModule({
      imports: [LocationProfile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'hall' }) },
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(LocationProfile);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/hall').flush({
      uuid: 'hall',
      name: 'Commons',
      address: 'Campus',
    });
    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush([
      {
        uuid: 'review-friend',
        user_id: 'friend',
        location_id: 'hall',
        rating: 9,
        note: 'Review',
        meal_type: 'Lunch',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
    ]);
    http.expectOne('http://localhost:8000/accounts').flush([]);
    http
      .expectOne('http://localhost:8000/follows/')
      .flush({}, { status: 500, statusText: 'Server Error' });

    fixture.detectChanges();
    expect(fixture.componentInstance.hall!.reviewCount).toBe(1);
    expect(fixture.componentInstance.hall!.friendRating).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Commons');
    http.verify();
  });
});
