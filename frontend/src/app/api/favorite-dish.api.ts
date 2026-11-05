import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { apiBaseUrl } from './api-base-url';
import type { FavoriteDishResponse } from '../types/favorite-dish';

@Injectable({ providedIn: 'root' })
export class FavoriteDishApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${apiBaseUrl}/favorite-dishes`;

  getAll() {
    return this.http.get<FavoriteDishResponse[]>(`${this.url}/`, {
      headers: this.authHeaders(),
    });
  }

  add(name: string, locationId: string, locationName: string) {
    return this.http.post<FavoriteDishResponse>(
      `${this.url}/`,
      { name, location_id: locationId, location_name: locationName },
      { headers: this.authHeaders() },
    );
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.url}/${encodeURIComponent(id)}`, {
      headers: this.authHeaders(),
    });
  }

  private authHeaders(): HttpHeaders | undefined {
    const token = sessionStorage.getItem('accessToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }
}
