import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

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

@Injectable({ providedIn: 'root' })
export class ReviewApi {
  private readonly http = inject(HttpClient);

  create(request: ReviewCreateRequest) {
    return this.http.post<ReviewResponse>('http://localhost:8000/reviews/', request);
  }
}
