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
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'hall' }) } } }],
    });
    const fixture = TestBed.createComponent(LocationProfile);
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/hall').flush({ uuid: 'hall', name: 'Commons', address: 'Campus' });
    http.expectOne('http://localhost:8000/reviews/?location_id=hall').flush(['me', 'someone-else'].map(user => ({
      uuid: user, user_id: user, location_id: 'hall', rating: 8,
      note: 'Lunch review', meal_type: 'Lunch', created_at: '2026-01-01', updated_at: '2026-01-01',
    })));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Options for your review"]').length).toBe(1);
    const component = fixture.componentInstance;
    const ownReview = component.hall!.reviews[0];
    component.deleteReview(component.hall!.reviews[1]);
    http.expectNone(request => request.method === 'DELETE');
    component.deleteReview(ownReview);
    component.deleteReview(ownReview);
    http.expectOne('http://localhost:8000/reviews/me').flush({}, { status: 500, statusText: 'Error' });
    expect(component.hall!.reviews.length).toBe(2);
    expect(component.reviewError()).toContain('Please try again');
    expect(component.deletingId()).toBeNull();
    component.deleteReview(ownReview);
    const deletion = http.expectOne('http://localhost:8000/reviews/me');
    expect(deletion.request.method).toBe('DELETE');
    deletion.flush({ message: 'Review deleted successfully' });
    expect(component.hall!.reviews.map(review => review.userId)).toEqual(['someone-else']);
    expect(component.hall!.reviewCount).toBe(1);
    expect(component.hall!.averageRating).toBe(8);
    sessionStorage.removeItem('currentAccount');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Options for your review"]').length).toBe(0);
    http.verify();
  });
});
