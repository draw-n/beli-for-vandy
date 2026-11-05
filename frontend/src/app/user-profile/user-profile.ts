import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

import { AccountApi } from '../api/account.api';
import { ReviewItem } from '../components/review-item/review-item';
import { apiBaseUrl } from '../api/api-base-url';
import { HttpClient } from '@angular/common/http';
import type { Account, PublicAccount } from '../types/auth';
import type { Review, ReviewResponse } from '../types/review';
import type { LocationResponse } from '../types/location';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    ReviewItem,
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class Profile {
  account: PublicAccount | null = null;
  reviews: Review[] = [];
  locationNames: Record<string, string> = {};

  private readonly route = inject(ActivatedRoute);
  private readonly accountApi = inject(AccountApi);
  private readonly http = inject(HttpClient);
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    const userId = this.route.snapshot.paramMap.get('id');

    if (userId) {
      this.loadUser(userId);
      this.loadReviews(userId);
    } else {
      this.account = this.loadAccount();
    }

    if (this.account) {
      this.loadReviews(this.account.uuid);
    }
  }

  private loadUser(userId: string): void {
    this.accountApi.getPublic().subscribe({
      next: (accounts) => {
        this.account =
          accounts.find((account) => account.uuid === userId) ?? null;

        this.changeDetector.markForCheck();
      },
      error: () => {
        this.account = null;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadReviews(userId: string): void {
    this.http
      .get<ReviewResponse[]>(
        `${apiBaseUrl}/reviews/?user_id=${encodeURIComponent(userId)}`
      )
      .subscribe({
        next: (reviews) => {
          this.reviews = reviews.map((review) => ({
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
          }));

          this.loadLocationNames();
          this.changeDetector.markForCheck();
        },
        error: () => {
          this.reviews = [];
          this.changeDetector.markForCheck();
        },
      });
  }

  private loadAccount(): Account | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const accountJson = sessionStorage.getItem('currentAccount');

    if (!accountJson) {
      return null;
    }

    try {
      return JSON.parse(accountJson) as Account;
    } catch {
      sessionStorage.removeItem('currentAccount');
      return null;
    }
  }

  private loadLocationNames(): void {
    const locationIds = [
      ...new Set(this.reviews.map((review) => review.locationId)),
    ];

    for (const locationId of locationIds) {
      this.http
        .get<LocationResponse>(
          `${apiBaseUrl}/locations/${encodeURIComponent(locationId)}`
        )
        .subscribe({
          next: (location) => {
            this.locationNames = {
              ...this.locationNames,
              [locationId]: location.name,
            };

            this.changeDetector.markForCheck();
          },
        });
    }
  }
}
