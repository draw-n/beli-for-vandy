import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FollowApi } from './follow.api';

const baseUrl = 'http://localhost:8000/follows';

describe('FollowApi HTTP contract', () => {
  let api: FollowApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(FollowApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets all follow relationships and returns the response', () => {
    const follows = [{ uuid: 'follow-1', from_user_id: 'user-1', to_user_id: 'user-2', is_mutual: false }];
    let received: unknown = undefined;
    api.getAll().subscribe((result) => received = result);

    const request = http.expectOne(`${baseUrl}/`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(follows);
    expect(received).toEqual(follows);
  });

  it('creates a follow with the supplied relationship fields', () => {
    const body = {
      from_user_id: 'user-1', to_user_id: 'user-2', is_mutual: false,
      created_at: '2026-10-18T12:00:00Z',
    };
    let received: unknown = undefined;
    api.create(body).subscribe((result) => received = result);

    const request = http.expectOne(`${baseUrl}/`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush({ ...body, uuid: 'follow-1' });
    expect(received).toEqual({ ...body, uuid: 'follow-1' });
  });

  it('updates an encoded relationship id and only sends supplied fields', () => {
    const body = { is_mutual: true };
    api.update('follow/1', body).subscribe();

    const request = http.expectOne(`${baseUrl}/follow%2F1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush({ uuid: 'follow/1', ...body });
  });

  it('deletes an encoded relationship id and returns the confirmation', () => {
    let received: unknown = undefined;
    api.delete('follow/1').subscribe((result) => received = result);

    const request = http.expectOne(`${baseUrl}/follow%2F1`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ message: 'Follow deleted successfully' });
    expect(received).toEqual({ message: 'Follow deleted successfully' });
  });

  it('passes server errors through unchanged', () => {
    let receivedStatus: number | undefined;
    api.getAll().subscribe({ error: (error: { status: number }) => receivedStatus = error.status });
    http.expectOne(`${baseUrl}/`).flush(
      { detail: 'forbidden' }, { status: 403, statusText: 'Forbidden' },
    );
    expect(receivedStatus).toBe(403);
  });
});
