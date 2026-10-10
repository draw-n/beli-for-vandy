import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { FollowCreateRequest, FollowResponse, FollowUpdateRequest } from '../types/follow';

@Injectable({
  providedIn: 'root',
})
export class FollowApi {
  private readonly http = inject(HttpClient);

  private readonly followsUrl = 'http://localhost:8000/follows';

  getAll(): Observable<FollowResponse[]> {
    return this.http.get<FollowResponse[]>(`${this.followsUrl}/`);
  }

  create(request: FollowCreateRequest): Observable<FollowResponse> {
    return this.http.post<FollowResponse>(`${this.followsUrl}/`, request);
  }

  update(id: string, request: FollowUpdateRequest): Observable<FollowResponse> {
    return this.http.put<FollowResponse>(`${this.followsUrl}/${encodeURIComponent(id)}`, request);
  }

  delete(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.followsUrl}/${encodeURIComponent(id)}`);
  }
}
