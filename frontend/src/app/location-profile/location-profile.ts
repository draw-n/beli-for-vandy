import { ReviewApi } from '../api/review.api';
import { apiBaseUrl } from '../api/api-base-url';
import type { LocationDetails, LocationResponse } from '../types/location';
import type { Review, ReviewResponse } from '../types/review';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { ReviewItem } from '../components/review-item/review-item';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ReviewDialog } from '../components/review-dialog/review-dialog';

type MealFilter = 'All' | 'Breakfast' | 'Lunch' | 'Dinner';

@Component({
  selector: 'app-location-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatDialogModule,
    ReviewItem,
  ],
  templateUrl: './location-profile.html',
  styleUrl: './location-profile.css',
})
export class LocationProfile {
  hall?: LocationDetails;
  readonly mealFilters: MealFilter[] = ['All', 'Breakfast', 'Lunch', 'Dinner'];
  selectedMealFilter: MealFilter = 'All';
  readonly deletingId = signal<string | null>(null);
  readonly reviewError = signal('');
  private readonly reviewApi = inject(ReviewApi);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);

  get filteredReviews(): Review[] {
    const reviews = this.hall?.reviews ?? [];
    const filteredReviews =
      this.selectedMealFilter === 'All'
        ? reviews
        : reviews.filter(
            (review) => review.mealType.toLowerCase() === this.selectedMealFilter.toLowerCase(),
          );

    return [...filteredReviews].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {
    const uuid = this.route.snapshot.paramMap.get('id');

    if (uuid) {
      this.http.get<LocationResponse>(`${apiBaseUrl}/locations/${encodeURIComponent(uuid)}`).subscribe({
        next: (hall) => {
          this.hall = {
            ...hall,
            location: hall.address,
            tags: hall.tags ?? [],
            hours: (hall.hours ?? []).map(([day, openTime, closeTime]) => ({
              day,
              openTime,
              closeTime,
            })),
            averageRating: 0,
            reviewCount: 0,
            friendRating: null,
            photos: [],
            reviews: [],
          };
          this.changeDetector.markForCheck();
          this.loadReviews(hall.uuid);
        },
        error: () => {
          this.hall = undefined;
          this.changeDetector.markForCheck();
        },
      });
    }
  }

  private loadReviews(locationId: string): void {
    this.http
      .get<ReviewResponse[]>(`${apiBaseUrl}/reviews/?location_id=${encodeURIComponent(locationId)}`)
      .subscribe({
        next: (reviews) => {
          const mappedReviews = reviews.map((review) => ({
            uuid: review.uuid,
            userId: review.user_id,
            locationId: review.location_id,
            rating: review.rating,
            reviewText: review.note ?? '',
            mealType: review.meal_type ?? '',
            createdAt: new Date(review.created_at),
            updatedAt: new Date(review.updated_at),
            photoIds: review.photo_ids ?? [],
          }));

          if (this.hall) {
            this.hall = {
              ...this.hall,
              reviews: mappedReviews,
              reviewCount: mappedReviews.length,
              averageRating:
                mappedReviews.length > 0
                  ? mappedReviews.reduce((total, review) => total + review.rating, 0) /
                    mappedReviews.length
                  : 0,
            };
            this.changeDetector.markForCheck();
          }
        },
      });
  }

  isOwnReview(review: Review): boolean {
    try {
      return review.userId === JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null')?.uuid;
    } catch {
      return false;
    }
  }

  deleteReview(review: Review): void {
    if (!this.hall || !this.isOwnReview(review) || this.deletingId()) {
      return;
    }
    this.deletingId.set(review.uuid);
    this.reviewError.set('');
    this.reviewApi.delete(review.uuid).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.hall) {
          const reviews = this.hall.reviews.filter((item) => item.uuid !== review.uuid);
          this.hall = {
            ...this.hall,
            reviews,
            reviewCount: reviews.length,
            averageRating: reviews.length
              ? reviews.reduce((total, item) => total + item.rating, 0) / reviews.length
              : 0,
          };
          this.changeDetector.markForCheck();
        }
      },
      error: () => {
        this.deletingId.set(null);
        this.reviewError.set('Could not delete your review. Please try again.');
      },
    });
  }

  openReviewDialog(review?: Review): void {
    if (!this.hall || (review && !this.isOwnReview(review))) {
      return;
    }

    const dialogRef = this.dialog.open(ReviewDialog, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        locationId: this.hall.uuid,
        locationName: this.hall.name,
        review,
      },
    });

    dialogRef.afterClosed().subscribe((result: ReviewResponse | undefined) => {
      if (!result || !this.hall) {
        return;
      }

      this.loadReviews(this.hall.uuid);
    });
  }
}
