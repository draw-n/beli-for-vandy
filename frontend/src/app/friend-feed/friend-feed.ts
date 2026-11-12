import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';

import { AccountApi } from '../api/account.api';
import { ReviewApi } from '../api/review.api';
import { apiBaseUrl } from '../api/api-base-url';
import { ReviewItem } from '../components/review-item/review-item';
import type { Review, ReviewResponse } from '../types/review';
import type { LocationResponse } from '../types/location';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-friend-feed',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, ReviewItem],
  templateUrl: './friend-feed.html',
  styleUrl: './friend-feed.css',
})
export class FriendFeed {
  reviews: Review[] = [];
  authorNames: Record<string, string> = {};
  locationNames: Record<string, string> = {};
  page = 1;
  hasMore = false;
  loading = true;
  errorMessage = '';

  private readonly accountApi = inject(AccountApi);
  private readonly reviewApi = inject(ReviewApi);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.reviewApi.getFriendFeed(page).subscribe({
      next: (response) => {
        this.reviews = response.reviews.map((review) => this.mapReview(review));
        this.page = page;
        this.hasMore = response.has_more;
        this.loadDisplayNames();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Could not load your friend feed.';
        this.cdr.markForCheck();
      },
    });
  }

  private loadDisplayNames(): void {
    const locationIds = [...new Set(this.reviews.map((review) => review.locationId))];
    this.accountApi.getPublic().subscribe({
      next: (accounts) => {
        this.authorNames = Object.fromEntries(
          accounts.map((account) => [account.uuid, `${account.first_name} ${account.last_name}`]),
        );
        if (locationIds.length === 0) {
          this.finishLoading();
          return;
        }
        forkJoin(
          locationIds.map((id) =>
            this.http.get<LocationResponse>(`${apiBaseUrl}/locations/${encodeURIComponent(id)}`),
          ),
        ).subscribe({
          next: (locations) => {
            this.locationNames = Object.fromEntries(
              locations.map((location) => [location.uuid, location.name]),
            );
            this.finishLoading();
          },
          error: () => this.finishLoading(),
        });
      },
      error: () => this.finishLoading(),
    });
  }

  private finishLoading(): void {
    this.loading = false;
    this.cdr.markForCheck();
  }

  private mapReview(review: ReviewResponse): Review {
    return {
      uuid: review.uuid,
      userId: review.user_id,
      locationId: review.location_id,
      rating: review.rating,
      reviewText: review.note ?? '',
      mealType: review.meal_type ?? '',
      createdAt: new Date(review.created_at),
      updatedAt: new Date(review.updated_at),
      photoIds: review.photo_ids ?? [],
      favoriteDishes: review.favorite_dishes ?? [],
    };
  }

  goToPage(page: number): void {
    if (page < 1 || (page > this.page && !this.hasMore) || this.loading) return;
    this.loadPage(page);
  }

}
