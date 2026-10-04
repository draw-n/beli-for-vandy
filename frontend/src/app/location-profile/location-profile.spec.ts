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
    sessionStorage.removeItem('currentAccount');
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[aria-label="Options for your review"]').length).toBe(0);
    http.verify();
  });
});
