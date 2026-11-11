import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { of } from 'rxjs';
import { PersonalRankingApi } from '../api/personal-ranking.api';
import type { RankingsResponse } from '../types/personal-ranking';
import { RankingsStore } from './rankings.store';

const RATED = [{ rank: 1, location_id: 'loc-1', location_name: 'Commons', rating: 9, uuid: 'r-1' }];
const UNRATED = [{ location_id: 'loc-2', location_name: 'Rand' }];
const LOADED_RESPONSE: RankingsResponse = { rated: RATED, unrated: UNRATED };
const EMPTY_RESPONSE: RankingsResponse = { rated: [], unrated: UNRATED };

describe('RankingsStore', () => {
  let store: RankingsStore;
  let mockApi: { getMyRankings: ReturnType<typeof vi.fn>; setRating: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockApi = { getMyRankings: vi.fn(), setRating: vi.fn() };
    TestBed.configureTestingModule({
      providers: [RankingsStore, { provide: PersonalRankingApi, useValue: mockApi }],
    });
    store = TestBed.inject(RankingsStore);
    sessionStorage.setItem('accessToken', 'test-token');
  });

  afterEach(() => sessionStorage.clear());

  it('populates rated and unrated on a successful load', async () => {
    mockApi.getMyRankings.mockReturnValue(of(LOADED_RESPONSE));
    await firstValueFrom(store.load());
    expect(store.rated()).toEqual(RATED);
    expect(store.unrated()).toEqual(UNRATED);
    expect(store.loaded()).toBe(true);
  });

  it('clears stale state before fetching so a second user does not see the first user\'s data', async () => {
    store.rated.set(RATED);
    store.unrated.set([]);
    store.loaded.set(true);

    mockApi.getMyRankings.mockReturnValue(of(EMPTY_RESPONSE));

    const load$ = store.load();
    expect(store.rated()).toEqual([]);
    expect(store.loaded()).toBe(false);

    await firstValueFrom(load$);
  });

  it('errors immediately when no access token is present', async () => {
    sessionStorage.removeItem('accessToken');
    await expect(firstValueFrom(store.load())).rejects.toThrow('Sign in');
  });

  it('calls setRating on the API and marks loaded false to trigger a reload', async () => {
    mockApi.setRating.mockReturnValue(of({}));
    await firstValueFrom(store.setRating('loc-1', 8));
    expect(mockApi.setRating).toHaveBeenCalledWith('loc-1', 8);
    expect(store.loaded()).toBe(false);
  });

  describe('errorMessage', () => {
    it('returns a session-expired message for 401', () => {
      const err = new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' });
      expect(store.errorMessage(err, 'load')).toContain('session expired');
    });

    it('returns a connection message for status 0', () => {
      const err = new HttpErrorResponse({ status: 0, statusText: '' });
      expect(store.errorMessage(err, 'load')).toContain('connect');
    });

    it('returns a generic message for unknown error types', () => {
      expect(store.errorMessage(new Error('oops'), 'save')).toContain('save');
    });
  });
});
