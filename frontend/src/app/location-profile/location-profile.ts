import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { ReviewDialog, ReviewFormResult } from '../components/review-dialog/review-dialog';

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
  ],
  templateUrl: './location-profile.html',
  styleUrl: './location-profile.css',
})
export class LocationProfile {
  hall?: LocationDetails;
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
  ) {
    const uuid = this.route.snapshot.paramMap.get('id');

    if (uuid) {
      this.http.get<LocationResponse>(`http://localhost:8000/locations/${encodeURIComponent(uuid)}`).subscribe({
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
      .get<ReviewResponse[]>(`http://localhost:8000/reviews/?location_id=${encodeURIComponent(locationId)}`)
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
                  ? mappedReviews.reduce((total, review) => total + review.rating, 0) / mappedReviews.length
                  : 0,
            };
            this.changeDetector.markForCheck();
          }
        },
      });
  }

  openReviewDialog(): void {
    if (!this.hall) {
      return;
    }

    const dialogRef = this.dialog.open(ReviewDialog, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        locationId: this.hall.uuid,
        locationName: this.hall.name,
      },
    });

    dialogRef.afterClosed().subscribe((result: ReviewFormResult | undefined) => {
      if (!result || !this.hall) {
        return;
      }

      console.log('Review form result:', result);
      console.log('Dining hall:', this.hall.uuid);
      console.log('Photos:', result.photos);

      // Later:
      // 1. Upload photos to backend
      // 2. Backend creates Photo records
      // 3. Get photo UUIDs
      // 4. POST the Review to backend
      // 5. Backend recalculates averageRating/reviewCount
      // 6. Refresh/re-fetch this dining hall
    });
  }
}
