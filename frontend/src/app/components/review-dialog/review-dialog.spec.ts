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
    // Boundary Value Analysis (BVA) for the valid rating range 1-10.

  it('rejects rating 0 because it is below the minimum boundary', () => {
    component.rating = 0;
    component.mealType = 'Lunch';

    component.submitReview();

    http.expectNone('http://localhost:8000/reviews/');
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('accepts rating 1 at the minimum boundary', () => {
    component.rating = 1;
    component.mealType = 'Lunch';

    component.submitReview();

    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.body.rating).toBe(1);

    request.flush({ uuid: 'review-1' });
  });

  it('accepts rating 2 just above the minimum boundary', () => {
    component.rating = 2;
    component.mealType = 'Lunch';

    component.submitReview();

    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.body.rating).toBe(2);

    request.flush({ uuid: 'review-2' });
  });

  it('accepts rating 9 just below the maximum boundary', () => {
    component.rating = 9;
    component.mealType = 'Lunch';

    component.submitReview();

    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.body.rating).toBe(9);

    request.flush({ uuid: 'review-9' });
  });

  it('accepts rating 10 at the maximum boundary', () => {
    component.rating = 10;
    component.mealType = 'Lunch';

    component.submitReview();

    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.body.rating).toBe(10);

    request.flush({ uuid: 'review-10' });
  });

  it('rejects rating 11 because it is above the maximum boundary', () => {
    component.rating = 11;
    component.mealType = 'Lunch';

    component.submitReview();

    http.expectNone('http://localhost:8000/reviews/');
    expect(dialog.close).not.toHaveBeenCalled();
  });

    it('rejects submission when meal type is missing', () => {
    component.rating = 5;
    component.mealType = '';

    component.submitReview();

    http.expectNone('http://localhost:8000/reviews/');
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('rejects submission when rating is missing', () => {
    component.rating = null;
    component.mealType = 'Lunch';

    component.submitReview();

    http.expectNone('http://localhost:8000/reviews/');
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('prefills an existing review and updates only editable fields', () => {
    const data = TestBed.inject(MAT_DIALOG_DATA);
    data.review = {
      uuid: 'review-1', userId: 'user-1', locationId: 'location-1',
      rating: 7, reviewText: 'Original note', mealType: 'Dinner',
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      photoIds: ['existing-photo'],
    };
    const editor = TestBed.createComponent(ReviewDialog).componentInstance;
    expect(editor.rating).toBe(7);
    expect(editor.reviewText).toBe('Original note');
    expect(editor.mealType).toBe('Dinner');
    editor.rating = 8;
    editor.reviewText = ' Updated note ';
    editor.submitReview();
    const request = http.expectOne('http://localhost:8000/reviews/review-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      rating: 8, note: 'Updated note', meal_type: 'Dinner', updated_at: expect.any(String),
    });
    request.flush({ uuid: 'review-1' });
    expect(dialog.close).toHaveBeenCalledWith({ uuid: 'review-1' });
  });

  it('rejects editing another account’s review without a request', () => {
    component.data.review = {
      uuid: 'other-review', userId: 'other-user', locationId: 'location-1',
      rating: 7, reviewText: '', mealType: 'Lunch',
      createdAt: new Date(), updatedAt: new Date(),
    };
    component.submitReview();
    http.expectNone(() => true);
    expect(component.errorMessage()).toBe('You can only edit your own reviews.');
    expect(dialog.close).not.toHaveBeenCalled();
  });

});
