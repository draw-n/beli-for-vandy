import { ReviewApi } from '../api/review.api';
import { AccountApi } from '../api/account.api';
import { FollowApi } from '../api/follow.api';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatProgressBarModule,
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
  private readonly accountApi = inject(AccountApi);
  private readonly followApi = inject(FollowApi);
  private currentUserId: string | null = null;
  private followedUserIds = new Set<string>();
  private followsLoaded = false;

  authorNames: Record<string, string> = {};

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

  get ratingDistribution(): { label: string; count: number; percentage: number }[] {
    const reviews = this.hall?.reviews ?? [];
    const buckets = [
      { label: '1–2', min: 1, max: 2, count: 0 },
      { label: '3–4', min: 3, max: 4, count: 0 },
      { label: '5–6', min: 5, max: 6, count: 0 },
      { label: '7–8', min: 7, max: 8, count: 0 },
      { label: '9–10', min: 9, max: 10, count: 0 },
    ];

    for (const review of reviews) {
      const bucket = buckets.find(
        (item) => review.rating >= item.min && review.rating <= item.max
      );
      if (bucket) bucket.count++;
    }

    return buckets.map(({ label, count }) => ({
      label,
      count,
      percentage: reviews.length ? (count / reviews.length) * 100 : 0,
    }));
  }

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {
    this.currentUserId = this.readCurrentUserId();
    this.loadFollowRelationships();
    const uuid = this.route.snapshot.paramMap.get('id');
    this.loadAuthorNames();

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

  private loadAuthorNames(): void {
    this.accountApi.getAll().subscribe({
      next: (accounts) => {
        this.authorNames = Object.fromEntries(
          accounts.map(account => [
            account.uuid,
            `${account.first_name} ${account.last_name}`
          ])
        );

        this.changeDetector.markForCheck();
      }
    });
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
            this.updateFriendRating();
          }
        },
      });
  }

  private readCurrentUserId(): string | null {
    try {
      const account = JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null');
      return typeof account?.uuid === 'string' && account.uuid.length > 0
        ? account.uuid
        : null;
    } catch {
      return null;
    }
  }

  private loadFollowRelationships(): void {
    if (!this.currentUserId) {
      this.followsLoaded = true;
      this.updateFriendRating();
      return;
    }

    this.followApi.getAll().subscribe({
      next: (follows) => {
        this.followedUserIds = new Set(
          follows
            .filter((follow) => follow.from_user_id === this.currentUserId)
            .map((follow) => follow.to_user_id)
        );
        this.followsLoaded = true;
        this.updateFriendRating();
      },
      error: () => {
        this.followedUserIds.clear();
        this.followsLoaded = true;
        this.updateFriendRating();
      },
    });
  }

  private updateFriendRating(): void {
    if (!this.hall) return;

    const friendReviews = this.followsLoaded && this.currentUserId
      ? this.hall.reviews.filter(
          (review) =>
            review.userId !== this.currentUserId &&
            this.followedUserIds.has(review.userId)
        )
      : [];

    this.hall = {
      ...this.hall,
      friendRating: friendReviews.length
        ? friendReviews.reduce((total, review) => total + review.rating, 0) /
          friendReviews.length
        : null,
    };
    this.changeDetector.markForCheck();
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
          this.updateFriendRating();
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
