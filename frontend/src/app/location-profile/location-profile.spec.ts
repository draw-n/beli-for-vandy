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
      ['me', 'someone-else'].map(user => ({
        uuid: user,
        user_id: user,
        location_id: 'hall',
        rating: 8,
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
    expect(component.hall!.averageRating).toBe(8);

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
});
