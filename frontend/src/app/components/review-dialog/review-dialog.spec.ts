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
    sessionStorage.removeItem('accessToken');
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

  it('validates supported image type, size, and the three-photo limit', () => {
    const createFile = (name: string, type: string, size = 10) => new File([new Uint8Array(size)], name, { type });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    component.selectPhotos({ target: { files: [createFile('bad.gif', 'image/gif')] } } as unknown as Event);
    expect(component.selectedPhotos).toHaveLength(0);
    expect(component.errorMessage()).toContain('JPEG, PNG, or WebP');
    component.selectPhotos({ target: { files: [createFile('large.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)] } } as unknown as Event);
    expect(component.selectedPhotos).toHaveLength(0);
    expect(component.errorMessage()).toContain('5 MB');
    component.keptPhotoIds.push('old-1', 'old-2', 'old-3');
    component.selectPhotos({ target: { files: [createFile('ok.webp', 'image/webp')] } } as unknown as Event);
    expect(component.selectedPhotos).toHaveLength(0);
    expect(component.errorMessage()).toContain('up to 3 photos');
    vi.restoreAllMocks();
  });

  it('creates a preview for an accepted photo and allows removing it', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const file = new File(['food'], 'food.png', { type: 'image/png' });
    component.selectPhotos({ target: { files: [file] } } as unknown as Event);
    expect(component.selectedPhotos[0].previewUrl).toBe('blob:preview');
    expect(component.photoCount).toBe(1);
    component.removeSelectedPhoto(0);
    expect(component.selectedPhotos).toHaveLength(0);
    vi.restoreAllMocks();
  });

  it('sends the bearer token, uploads once, and reuses the photo id after review save failure', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:retry');
    component.selectPhotos({ target: { files: [new File(['image'], 'food.jpg', { type: 'image/jpeg' })] } } as unknown as Event);
    component.submitReview();
    const upload = http.expectOne('http://localhost:8000/photos/');
    expect(upload.request.headers.get('Authorization')).toBe('Bearer signed-token');
    expect(upload.request.method).toBe('POST');
    upload.flush({ uuid: 'photo-1' });
    const failedSave = http.expectOne('http://localhost:8000/reviews/');
    expect(failedSave.request.headers.get('Authorization')).toBe('Bearer signed-token');
    expect(failedSave.request.body.photo_ids).toEqual(['photo-1']);
    failedSave.flush({}, { status: 500, statusText: 'Error' });
    expect(component.errorMessage()).toContain('remain pending');

    component.submitReview();
    http.expectNone('http://localhost:8000/photos/');
    const retrySave = http.expectOne('http://localhost:8000/reviews/');
    expect(retrySave.request.body.photo_ids).toEqual(['photo-1']);
    retrySave.flush({ uuid: 'review-1' });
    expect(dialog.close).toHaveBeenCalledWith({ uuid: 'review-1' });
    vi.restoreAllMocks();
  });

  it('retries only photos that failed after earlier uploads succeeded', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:retry');
    component.selectPhotos({ target: { files: [
      new File(['1'], 'one.png', { type: 'image/png' }),
      new File(['2'], 'two.png', { type: 'image/png' }),
    ] } } as unknown as Event);
    component.submitReview();
    http.expectOne('http://localhost:8000/photos/').flush({ uuid: 'photo-1' });
    http.expectOne('http://localhost:8000/photos/').flush({}, { status: 500, statusText: 'Error' });
    expect(component.selectedPhotos[0].uploadedId).toBe('photo-1');
    component.submitReview();
    const retriedPhoto = http.expectOne('http://localhost:8000/photos/');
    expect(retriedPhoto.request.body.get('file')?.name).toBe('two.png');
    retriedPhoto.flush({ uuid: 'photo-2' });
    const review = http.expectOne('http://localhost:8000/reviews/');
    expect(review.request.body.photo_ids).toEqual(['photo-1', 'photo-2']);
    review.flush({ uuid: 'review-1' });
    vi.restoreAllMocks();
  });

  it('preserves existing photo ids without uploading when photo selection is unchanged', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    component.data.review = {
      uuid: 'review-1', userId: 'user-1', locationId: 'location-1', rating: 7,
      reviewText: 'Original', mealType: 'Dinner', createdAt: new Date(), updatedAt: new Date(), photoIds: ['existing-photo'],
    };
    const editor = TestBed.createComponent(ReviewDialog).componentInstance;
    editor.rating = 8;
    editor.mealType = 'Dinner';
    editor.submitReview();
    http.expectNone('http://localhost:8000/photos/');
    const update = http.expectOne('http://localhost:8000/reviews/review-1');
    expect(update.request.body).not.toHaveProperty('photo_ids');
    expect(update.request.headers.has('Authorization')).toBe(false);
    update.flush({ uuid: 'review-1' });
  });

  it('sends a token when editing photo references and displays an expired-token message', () => {
    sessionStorage.setItem('accessToken', 'expired-token');
    component.data.review = {
      uuid: 'review-1', userId: 'user-1', locationId: 'location-1', rating: 7,
      reviewText: 'Original', mealType: 'Dinner', createdAt: new Date(), updatedAt: new Date(), photoIds: ['existing-photo'],
    };
    const editor = TestBed.createComponent(ReviewDialog).componentInstance;
    editor.removeKeptPhoto('existing-photo');
    editor.submitReview();
    const update = http.expectOne('http://localhost:8000/reviews/review-1');
    expect(update.request.body.photo_ids).toEqual([]);
    expect(update.request.headers.get('Authorization')).toBe('Bearer expired-token');
    update.flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(editor.errorMessage()).toContain('session has expired');
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('keeps text-only review submission available without a bearer token', () => {
    sessionStorage.removeItem('accessToken');
    component.submitReview();
    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.body.photo_ids).toEqual([]);
    request.flush({ uuid: 'review-text-only' });
  });

  it('requires a bearer token before photo changes but leaves the dialog open', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:needs-login');
    component.selectPhotos({ target: { files: [new File(['food'], 'food.webp', { type: 'image/webp' })] } } as unknown as Event);
    component.submitReview();
    expect(component.errorMessage()).toContain('log in again');
    http.expectNone('http://localhost:8000/photos/');
    http.expectNone('http://localhost:8000/reviews/');
    expect(dialog.close).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

});
