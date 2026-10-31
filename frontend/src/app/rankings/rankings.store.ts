import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, shareReplay, tap, throwError } from 'rxjs';
import { PersonalRankingApi } from '../api/personal-ranking.api';
import type { RankedEntry, UnratedEntry } from '../types/personal-ranking';

@Injectable({ providedIn: 'root' })
export class RankingsStore {
  private readonly api = inject(PersonalRankingApi);
  readonly rated = signal<RankedEntry[]>([]);
  readonly unrated = signal<UnratedEntry[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly saving = signal<string | null>(null);
  private loadRequest?: Observable<{ rated: RankedEntry[]; unrated: UnratedEntry[] }>;

  load(): Observable<{ rated: RankedEntry[]; unrated: UnratedEntry[] }> {
    if (!sessionStorage.getItem('accessToken')) return throwError(() => new Error('Sign in to view your rankings.'));
    if (this.loadRequest) return this.loadRequest;
    this.loading.set(true);
    this.loadRequest = this.api.getMyRankings().pipe(
      tap((data) => { this.rated.set(data.rated); this.unrated.set(data.unrated); this.loaded.set(true); }),
      finalize(() => { this.loading.set(false); this.loadRequest = undefined; }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.loadRequest;
  }

  setRating(locationId: string, rating: number): Observable<unknown> {
    this.saving.set(locationId);
    return this.api.setRating(locationId, rating).pipe(
      tap(() => this.loaded.set(false)),
      finalize(() => this.saving.set(null)),
    );
  }

  errorMessage(error: unknown, action: string): string {
    if (!(error instanceof HttpErrorResponse)) return `Could not ${action} ranking. Please try again.`;
    if (error.status === 401) return 'Your session expired. Please log in again.';
    if (error.status === 0) return 'Could not connect to the server.';
    const d = typeof error.error?.detail === 'string' ? error.error.detail : '';
    return d ? `Could not ${action} ranking: ${d}` : `Could not ${action} ranking (HTTP ${error.status}).`;
  }
}
