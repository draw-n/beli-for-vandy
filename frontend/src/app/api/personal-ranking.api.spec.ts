import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PersonalRankingApi } from './personal-ranking.api';

const baseUrl = 'http://localhost:8000/personal-rankings';

describe('PersonalRankingApi HTTP contract', () => {
  let api: PersonalRankingApi;
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.setItem('accessToken', 'test-token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(PersonalRankingApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('gets rankings and passes the Authorization header', () => {
    const response = { rated: [], unrated: [] };
    let received: unknown;
    api.getMyRankings().subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush(response);
    expect(received).toEqual(response);
  });

  it('sets a rating with PUT to the correct URL with body and Authorization header', () => {
    const response = {
      uuid: 'r-1', location_id: 'loc-1', rating: 8,
      created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
    };
    let received: unknown;
    api.setRating('loc-1', 8).subscribe((r) => (received = r));

    const req = http.expectOne(`${baseUrl}/loc-1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ rating: 8 });
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush(response);
    expect(received).toEqual(response);
  });

  it('URL-encodes a location id that contains slashes', () => {
    api.setRating('loc/1', 7).subscribe();
    http.expectOne(`${baseUrl}/loc%2F1`).flush({});
  });

  it('omits the Authorization header when no token is in sessionStorage', () => {
    sessionStorage.removeItem('accessToken');
    api.getMyRankings().subscribe();
    const req = http.expectOne(`${baseUrl}/`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ rated: [], unrated: [] });
  });

  it('passes server errors through unchanged', () => {
    let receivedStatus: number | undefined;
    api
      .getMyRankings()
      .subscribe({ error: (e: { status: number }) => (receivedStatus = e.status) });
    http
      .expectOne(`${baseUrl}/`)
      .flush({ detail: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });
    expect(receivedStatus).toBe(401);
  });
});
