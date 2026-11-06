import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { apiBaseUrl } from './api-base-url';
import type { PersonalRankingResponse, RankingsResponse } from '../types/personal-ranking';

@Injectable({ providedIn: 'root' })
export class PersonalRankingApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${apiBaseUrl}/personal-rankings`;
  getMyRankings() {
    return this.http.get<RankingsResponse>(`${this.url}/`, { headers: this.authHeaders() });
  }
  setRating(locationId: string, rating: number) {
    return this.http.put<PersonalRankingResponse>(
      `${this.url}/${encodeURIComponent(locationId)}`, { rating }, { headers: this.authHeaders() },
    );
  }
  private authHeaders(): HttpHeaders | undefined {
    const token = sessionStorage.getItem('accessToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }
}
