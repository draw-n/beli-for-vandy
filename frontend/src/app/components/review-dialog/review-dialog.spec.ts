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
      favorite_dishes: [],
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

  it('accepts the current 1–10 rating endpoints and rejects values outside them', () => {
    for (const rating of [0, 11, 1.5, null]) {
      component.rating = rating;
      component.submitReview();
      http.expectNone('http://localhost:8000/reviews/');
    }

    for (const rating of [1, 10]) {
      const boundaryComponent = TestBed.createComponent(ReviewDialog).componentInstance;
      boundaryComponent.rating = rating;
      boundaryComponent.mealType = 'Lunch';
      boundaryComponent.submitReview();
      const request = http.expectOne('http://localhost:8000/reviews/');
      expect(request.request.body.rating).toBe(rating);
      request.flush({ uuid: `review-${rating}` });
    }
  });
  it('prefills an existing review and updates only editable fields', () => {
    const data = TestBed.inject(MAT_DIALOG_DATA);
    data.review = {
      uuid: 'review-1', userId: 'user-1', locationId: 'location-1',
      rating: 7, reviewText: 'Original note', mealType: 'Dinner',
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      photoIds: ['existing-photo'],
      favoriteDishes: ['soup', 'pie'],
    };
    const editor = TestBed.createComponent(ReviewDialog).componentInstance;
    expect(editor.rating).toBe(7);
    expect(editor.reviewText).toBe('Original note');
    expect(editor.mealType).toBe('Dinner');
    expect(editor.favoriteDishesText).toBe('soup, pie');
    editor.rating = 8;
    editor.reviewText = ' Updated note ';
    editor.favoriteDishesText = '  cHicken curry,  nAAN, , ';
    editor.submitReview();
    const request = http.expectOne('http://localhost:8000/reviews/review-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      rating: 8, note: 'Updated note', meal_type: 'Dinner', updated_at: expect.any(String),
      favorite_dishes: ['Chicken curry', 'Naan'],
    });
    sessionStorage.setItem('accessToken', 'signed-token');
    request.flush({ uuid: 'review-1' });
    http.expectOne('http://localhost:8000/favorite-dishes/').flush([
      { uuid: '1', name: 'Chicken curry', location_id: 'location-1', location_name: 'Commons', created_at: '' },
      { uuid: '2', name: 'Naan', location_id: 'location-1', location_name: 'Commons', created_at: '' },
    ]);
    expect(dialog.close).toHaveBeenCalledWith({ uuid: 'review-1' });
  });

  it('accepts commas and new lines as favorite dish separators', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    component.favoriteDishesText = 'mac and cheese, beef\r\nroasted vegetables';
    component.submitReview();
    const request = http.expectOne('http://localhost:8000/reviews/');
    expect(request.request.body.favorite_dishes).toEqual([
      'Mac and cheese',
      'Beef',
      'Roasted vegetables',
    ]);
    request.flush({ uuid: 'review-1' });
    http.expectOne('http://localhost:8000/favorite-dishes/').flush([
      { uuid: '1', name: 'Mac and cheese', location_id: 'location-1', location_name: 'Commons', created_at: '' },
      { uuid: '2', name: 'Beef', location_id: 'location-1', location_name: 'Commons', created_at: '' },
      { uuid: '3', name: 'Roasted vegetables', location_id: 'location-1', location_name: 'Commons', created_at: '' },
    ]);
    expect(dialog.close).toHaveBeenCalledWith({ uuid: 'review-1' });
  });

  it('keeps the saved review and explains when sign-in is needed to favorite dishes', () => {
    component.favoriteDishesText = 'Mac and cheese';
    component.submitReview();
    http.expectOne('http://localhost:8000/reviews/').flush({ uuid: 'review-1' });

    expect(component.savedReview?.uuid).toBe('review-1');
    expect(component.errorMessage()).toContain('Sign in to access favorite dishes.');
    expect(dialog.close).not.toHaveBeenCalled();
  });

  it('automatically favorites review dishes at the reviewed location', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    component.favoriteDishesText = 'Mac and cheese, beef';
    component.submitReview();

    const review = http.expectOne('http://localhost:8000/reviews/');
    review.flush({ uuid: 'review-1' });

    const load = http.expectOne('http://localhost:8000/favorite-dishes/');
    expect(load.request.headers.has('Authorization')).toBe(true);
    load.flush([{
      uuid: 'dish-1',
      name: 'Mac and cheese',
      location_id: 'location-1',
      location_name: 'Commons',
      created_at: '2026-10-18T12:00:00Z',
    }]);

    const add = http.expectOne('http://localhost:8000/favorite-dishes/');
    expect(add.request.body).toEqual({
      name: 'Beef',
      location_id: 'location-1',
      location_name: 'Commons',
    });
    expect(dialog.close).not.toHaveBeenCalled();
    add.flush({
      uuid: 'dish-2',
      name: 'Beef',
      location_id: 'location-1',
      location_name: 'Commons',
      created_at: '2026-10-18T12:00:00Z',
    });
    expect(dialog.close).toHaveBeenCalledWith({ uuid: 'review-1' });
  });

  it('rejects editing another account’s review without a request', () => {
    component.data.review = {
      uuid: 'other-review', userId: 'other-user', locationId: 'location-1',
      rating: 7, reviewText: '', mealType: 'Lunch',
      createdAt: new Date(), updatedAt: new Date(),
      favoriteDishes: [],
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

  it('accepts images just below and exactly at 5 MiB, but rejects one byte above', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:size-boundary');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const select = (size: number) => component.selectPhotos({
      target: { files: [new File([new Uint8Array(size)], 'food.jpg', { type: 'image/jpeg' })] },
    } as unknown as Event);

    select(5 * 1024 * 1024 - 1);
    select(5 * 1024 * 1024);
    expect(component.selectedPhotos).toHaveLength(2);
    select(5 * 1024 * 1024 + 1);
    expect(component.selectedPhotos).toHaveLength(2);
    expect(component.errorMessage()).toContain('5 MB');
    vi.restoreAllMocks();
  });

  it('allows photo counts from one through three and rejects the fourth selection', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:count-boundary');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const files = (count: number) => Array.from(
      { length: count }, (_, index) => new File([`photo-${index}`], `${index}.jpg`, { type: 'image/jpeg' }),
    );

    component.selectPhotos({ target: { files: files(3) } } as unknown as Event);
    expect(component.photoCount).toBe(3);
    component.selectPhotos({ target: { files: files(1) } } as unknown as Event);
    expect(component.photoCount).toBe(3);
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
      favoriteDishes: [],
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
      favoriteDishes: [],
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
