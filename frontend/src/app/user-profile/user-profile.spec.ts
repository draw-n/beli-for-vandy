import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Profile } from './user-profile';

const baseUrl = 'http://localhost:8000';

function makeAccount(uuid: string) {
  return { uuid, username: uuid, first_name: 'Test', last_name: 'User', email: `${uuid}@test.com`, type: 'student', home_city: 'Nashville' };
}

describe('Profile - friend rankings section', () => {
  afterEach(() => sessionStorage.clear());

  function setup(userId: string) {
    TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: userId }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(Profile);
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  it('requests friend rankings when viewing another user with an access token', () => {
    sessionStorage.setItem('accessToken', 'test-token');
    const { http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    const rankingsReq = http.expectOne(`${baseUrl}/personal-rankings/users/friend-id`);
    expect(rankingsReq.request.method).toBe('GET');
    expect(rankingsReq.request.headers.get('Authorization')).toBe('Bearer test-token');
    rankingsReq.flush([]);
    http.verify();
  });

  it('does not request rankings when no access token is present', () => {
    const { http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    http.expectNone(`${baseUrl}/personal-rankings/users/friend-id`);
    http.verify();
  });

  it('renders the ranked dining halls in order', async () => {
    sessionStorage.setItem('accessToken', 'test-token');
    const { fixture, http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    http.expectOne(`${baseUrl}/personal-rankings/users/friend-id`).flush([
      { rank: 1, location_id: 'loc-1', location_name: 'Commons', rating: 9.5, uuid: 'r-1' },
      { rank: 2, location_id: 'loc-2', location_name: 'Rand', rating: 7, uuid: 'r-2' },
    ]);

    fixture.detectChanges();
    await fixture.whenStable();

    const rows = fixture.nativeElement.querySelectorAll('.ranking-row') as NodeListOf<HTMLElement>;
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('#1');
    expect(rows[0].textContent).toContain('Commons');
    expect(rows[0].textContent).toContain('9.5');
    expect(rows[1].textContent).toContain('#2');
    expect(rows[1].textContent).toContain('Rand');
    http.verify();
  });

  it('shows the empty state when a user has no rankings', async () => {
    sessionStorage.setItem('accessToken', 'test-token');
    const { fixture, http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    http.expectOne(`${baseUrl}/personal-rankings/users/friend-id`).flush([]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No rankings yet');
    http.verify();
  });

  it('shows the error state when the rankings request fails', async () => {
    sessionStorage.setItem('accessToken', 'test-token');
    const { fixture, http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    http
      .expectOne(`${baseUrl}/personal-rankings/users/friend-id`)
      .flush({ detail: 'error' }, { status: 500, statusText: 'Server Error' });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('Could not load rankings');
    http.verify();
  });

  it('sets rankingsLoading to false after a successful response', async () => {
    sessionStorage.setItem('accessToken', 'test-token');
    const { fixture, http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    http.expectOne(`${baseUrl}/personal-rankings/users/friend-id`).flush([]);

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.rankingsLoading).toBe(false);
    http.verify();
  });

  it('sets rankingsLoading to false after an error response', async () => {
    sessionStorage.setItem('accessToken', 'test-token');
    const { fixture, http } = setup('friend-id');

    http.expectOne(`${baseUrl}/accounts/public`).flush([makeAccount('friend-id')]);
    http.expectOne(`${baseUrl}/reviews/?user_id=friend-id`).flush([]);
    http
      .expectOne(`${baseUrl}/personal-rankings/users/friend-id`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.rankingsLoading).toBe(false);
    expect(fixture.componentInstance.rankingsError).toBe(true);
    http.verify();
  });
});
