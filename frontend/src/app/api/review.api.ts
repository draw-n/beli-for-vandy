import type { ReviewResponse } from '../types/review';
import { HttpClient } from '@angular/common/http';
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
}

export type ReviewUpdateRequest = Pick<ReviewCreateRequest, 'rating' | 'note' | 'meal_type' | 'updated_at'>;

@Injectable({ providedIn: 'root' })
export class ReviewApi {
  private readonly http = inject(HttpClient);

  delete(id: string) {
    return this.http.delete<{ message: string }>(`${apiBaseUrl}/reviews/${encodeURIComponent(id)}`);
  }

  update(id: string, request: ReviewUpdateRequest) {
    return this.http.put<ReviewResponse>(`${apiBaseUrl}/reviews/${encodeURIComponent(id)}`, request);
  }

  create(request: ReviewCreateRequest) {
    return this.http.post<ReviewResponse>(`${apiBaseUrl}/reviews/`, request);
  }
}
