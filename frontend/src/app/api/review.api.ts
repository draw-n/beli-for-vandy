import type { ReviewResponse } from '../types/review';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { apiBaseUrl } from './api-base-url';

export interface ReviewCreateRequest {
  user_id: string;
  location_id: string;
  rating: number;
  note: string;
  meal_type: string;
  created_at: string;
  updated_at: string;
  photo_ids: string[];
  favorite_dishes: string[];
}

export type ReviewUpdateRequest = Pick<ReviewCreateRequest, 'rating' | 'note' | 'meal_type' | 'updated_at' | 'favorite_dishes'> & {
  photo_ids?: string[] | null;
};

export interface PhotoUploadResponse {
  uuid: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewApi {
  private readonly http = inject(HttpClient);

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${apiBaseUrl}/reviews/${encodeURIComponent(id)}`);
  }

  update(id: string, request: ReviewUpdateRequest) {
    return this.http.put<ReviewResponse>(`${apiBaseUrl}/reviews/${encodeURIComponent(id)}`, request, {
      headers: this.authHeaders('photo_ids' in request),
    });
  }

  create(request: ReviewCreateRequest) {
    return this.http.post<ReviewResponse>(`${apiBaseUrl}/reviews/`, request, {
      headers: this.authHeaders(request.photo_ids.length > 0),
    });
  }

  uploadPhoto(file: File) {
    const body = new FormData();
    body.append('file', file);
    const token = sessionStorage.getItem('accessToken');
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post<PhotoUploadResponse>(`${apiBaseUrl}/photos/`, body, { headers });
  }

  private authHeaders(required: boolean): HttpHeaders | undefined {
    if (!required) return undefined;
    const token = sessionStorage.getItem('accessToken');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
  }
}
