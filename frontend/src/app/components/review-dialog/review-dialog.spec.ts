import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReviewDialog } from './review-dialog';

describe('ReviewDialog submission', () => {
  let component: ReviewDialog;
  let http: HttpTestingController;
  const dialog = { close: vi.fn(), disableClose: false };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReviewDialog],
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: dialog },
        { provide: MAT_DIALOG_DATA, useValue: { locationId: 'location-1', locationName: 'Commons' } },
      ],
    });
    component = TestBed.createComponent(ReviewDialog).componentInstance;
    http = TestBed.inject(HttpTestingController);
    dialog.close.mockClear();
    dialog.disableClose = false;
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'user-1' }));
    component.rating = 9;
    component.mealType = 'Lunch';
    component.reviewText = '  Great lunch  ';
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem('currentAccount');
  });

  it('maps form fields, prevents duplicate submissions and closes only after success', () => {
    component.submitReview();
    component.submitReview();
    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      user_id: 'user-1', location_id: 'location-1', rating: 9,
      note: 'Great lunch', meal_type: 'Lunch', photo_ids: [],
      created_at: expect.any(String), updated_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(request.request.body.created_at))).toBe(false);
    expect(request.request.body.created_at).toBe(request.request.body.updated_at);
    expect(dialog.close).not.toHaveBeenCalled();
    const saved = { ...request.request.body, uuid: 'review-1' };
    request.flush(saved);
    expect(dialog.close).toHaveBeenCalledWith(saved);
  });

  it('preserves form input on failure and allows retry', () => {
    component.submitReview();
    http.expectOne('http://localhost:8000/reviews/').flush({}, { status: 500, statusText: 'Error' });
    expect(component.saving()).toBe(false);
    expect(component.errorMessage()).toContain('Please try again');
    expect(component.reviewText).toBe('  Great lunch  ');
    expect(dialog.close).not.toHaveBeenCalled();
    expect(dialog.disableClose).toBe(false);
    component.submitReview();
    http.expectOne('http://localhost:8000/reviews/').flush({ uuid: 'review-2' });
  });

  it('does not send fractional ratings or missing account data', () => {
    component.rating = 8.5;
    component.submitReview();
    http.expectNone('http://localhost:8000/reviews/');
    component.rating = 9;
    sessionStorage.removeItem('currentAccount');
    component.submitReview();
    expect(component.errorMessage()).toContain('Please log in');
    http.expectNone('http://localhost:8000/reviews/');
  });
});
