import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { apiBaseUrl } from './api-base-url';
import { ReviewApi, type ReviewCreateRequest } from './review.api';

const reviewRequest: ReviewCreateRequest = {
  user_id: 'user-1', location_id: 'location-1', rating: 9, note: 'Great meal',
  meal_type: 'Lunch', created_at: '2026-10-18T12:00:00Z',
  updated_at: '2026-10-18T12:00:00Z', photo_ids: [], favorite_dishes: [],
};

describe('ReviewApi HTTP contract', () => {
  let api: ReviewApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(ReviewApi);
    http = TestBed.inject(HttpTestingController);
    sessionStorage.removeItem('accessToken');
  });

  afterEach(() => {
    http.verify();
    sessionStorage.removeItem('accessToken');
  });

  it('creates a text-only review without attaching an authorization header', () => {
    sessionStorage.setItem('accessToken', 'stored-but-unneeded-token');
    const response = { ...reviewRequest, uuid: 'review-1' };
    let received: unknown = undefined;
    api.create(reviewRequest).subscribe((result) => received = result);

    const request = http.expectOne(`${apiBaseUrl}/reviews/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(reviewRequest);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);
    expect(received).toEqual(response);
  });

  it('sends a bearer token when creating a review with photos', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    const body = { ...reviewRequest, photo_ids: ['photo-1'] };
    api.create(body).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/reviews/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush({ ...body, uuid: 'review-1' });
  });

  it('updates encoded review IDs and omits auth when photo_ids is omitted', () => {
    api.update('review/1', {
      rating: 10, note: 'Updated', meal_type: 'Dinner', updated_at: '2026-10-18T13:00:00Z',
      favorite_dishes: ['soup'],
    }).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/reviews/review%2F1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      rating: 10, note: 'Updated', meal_type: 'Dinner', updated_at: '2026-10-18T13:00:00Z',
      favorite_dishes: ['soup'],
    });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ uuid: 'review/1' });
  });

  it.each([[], null])('sends bearer auth when photo_ids is explicitly %s', (photoIds) => {
    sessionStorage.setItem('accessToken', 'signed-token');
    const body = {
      rating: 9, note: '', meal_type: 'Lunch', updated_at: '2026-10-18T13:00:00Z',
      favorite_dishes: [],
      photo_ids: photoIds,
    };
    api.update('review-1', body).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/reviews/review-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    request.flush({ uuid: 'review-1' });
  });

  it('deletes a review without attaching a bearer token', () => {
    sessionStorage.setItem('accessToken', 'stored-but-unneeded-token');
    api.delete('review/1').subscribe();

    const request = http.expectOne(`${apiBaseUrl}/reviews/review%2F1`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ message: 'Review deleted successfully' });
  });

  it('uploads multipart photo data with bearer authentication', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    const file = new File(['food image'], 'food.png', { type: 'image/png' });
    api.uploadPhoto(file).subscribe();

    const request = http.expectOne(`${apiBaseUrl}/photos/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    expect(request.request.body instanceof FormData).toBe(true);
    expect(request.request.body.get('file')).toBe(file);
    request.flush({ uuid: 'photo-1' });
  });

  it.each([401, 403, 413, 422, 500])('preserves HTTP %i errors for callers', (status) => {
    let receivedStatus: number | undefined;
    api.create(reviewRequest).subscribe({
      error: (error: { status: number }) => receivedStatus = error.status,
    });
    http.expectOne(`${apiBaseUrl}/reviews/`).flush(
      { detail: 'request failed' }, { status, statusText: 'Request failed' },
    );
    expect(receivedStatus).toBe(status);
  });
});
