import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AccountApi } from './account.api';
import { apiBaseUrl } from './api-base-url';

describe('AccountApi HTTP contract', () => {
  let api: AccountApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(AccountApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets accounts with GET and preserves the response array', () => {
    const accounts = [{ uuid: 'user-1', username: 'ava' }];
    let received: unknown;
    api.getAll().subscribe((result) => received = result);

    const request = http.expectOne(`${apiBaseUrl}/accounts`);
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(accounts);
    expect(received).toEqual(accounts);
  });

  it('gets public accounts without requiring account administration access', () => {
    const accounts = [{
      uuid: 'user-1',
      username: 'ava',
      first_name: 'Ava',
      last_name: 'Martin',
      year_graduation: 2027,
      type: 'student' as const,
    }];
    let received: unknown;
    api.getPublic().subscribe((result) => received = result);

    const request = http.expectOne(`${apiBaseUrl}/accounts/public`);
    expect(request.request.method).toBe('GET');
    request.flush(accounts);
    expect(received).toEqual(accounts);
  });

  it('posts account registration fields and returns the created account', () => {
    const body = {
      username: 'ava', first_name: 'Ava', last_name: 'Martin', email: 'ava@example.com',
      password: 'secret', type: 'student' as const, home_city: 'Nashville', year_graduation: 2027,
    };
    const response = { ...body, uuid: 'user-1', created_at: '2026-10-18T12:00:00Z' };
    let received: unknown;
    api.create(body).subscribe((result) => received = result);

    const request = http.expectOne(`${apiBaseUrl}/accounts`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);
    expect(received).toEqual(response);
  });

  it('posts login credentials and preserves JWT response fields', () => {
    const body = { username: 'ava', password: 'secret' };
    const response = {
      uuid: 'user-1', username: 'ava', access_token: 'signed-token',
      token_type: 'bearer', expires_at: '2026-10-18T12:15:00Z',
    };
    let received: unknown;
    api.login(body).subscribe((result) => received = result);

    const request = http.expectOne(`${apiBaseUrl}/accounts/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(response);
    expect(received).toEqual(response);
  });

  it('deletes an account with credentials in the DELETE body', () => {
    const body = { email: 'ava@example.com', password: 'secret' };
    let completed = false;
    api.delete(body).subscribe(() => completed = true);

    const request = http.expectOne(`${apiBaseUrl}/accounts`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual(body);
    request.flush(null);
    expect(completed).toBe(true);
  });

  it.each([401, 422, 503])('passes HTTP %i errors to the caller', (status) => {
    let receivedStatus: number | undefined;
    api.login({ username: 'ava', password: 'wrong' }).subscribe({
      error: (error: { status: number }) => receivedStatus = error.status,
    });
    http.expectOne(`${apiBaseUrl}/accounts/login`).flush(
      { detail: 'request failed' }, { status, statusText: 'Request failed' },
    );
    expect(receivedStatus).toBe(status);
  });
});
