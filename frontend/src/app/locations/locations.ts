import type { ReviewResponse } from '../types/review';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { apiBaseUrl } from '../api/api-base-url';
import type { LocationDetails, LocationHours, LocationResponse } from '../types/location';
import { locationCoverImage } from '../types/location-cover-image';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatToolbarModule,
    MatSelectModule,
  ],
  templateUrl: './locations.html',
  styleUrl: './locations.css',
})
export class Locations {
  searchTerm = '';
  selectedTag = '';
  readonly locations = signal<LocationDetails[]>([]);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  constructor() {
    this.http.get<LocationResponse[]>(`${apiBaseUrl}/locations/`).subscribe({
      next: (locations) => {
        this.locations.set(
          locations.map((location) => ({
            uuid: location.uuid,
            name: location.name,
            image: locationCoverImage(location.uuid),
            location: location.address,
            tags: location.tags ?? [],
            hours: (location.hours ?? []).map(([day, openTime, closeTime]) => ({
              day,
              openTime,
              closeTime,
            })),
            averageRating: 0,
            reviewCount: 0,
            friendRating: null,
            photos: [],
            reviews: [],
          })),
        );
        this.http.get<ReviewResponse[]>(`${apiBaseUrl}/reviews/`).subscribe({
          next: (reviews) => {
            const reviewsByLocation = new Map<string, ReviewResponse[]>();

            for (const review of reviews) {
              const locationReviews = reviewsByLocation.get(review.location_id) ?? [];
              locationReviews.push(review);
              reviewsByLocation.set(review.location_id, locationReviews);
            }

            this.locations.update((currentLocations) =>
              currentLocations.map((location) => {
                const locationReviews = reviewsByLocation.get(location.uuid) ?? [];

                return {
                  ...location,
                  reviewCount: locationReviews.length,
                  averageRating:
                    locationReviews.length > 0
                      ? locationReviews.reduce((total, review) => total + review.rating, 0) /
                        locationReviews.length
                      : 0,
                };
              }),
            );
          },
        });
      },
      error: () => {
        this.locations.set([]);
      },
    });
  }

  get availableTags(): string[] {
    return [...new Set(this.locations().flatMap((hall) => hall.tags))].sort((a, b) =>
      a.localeCompare(b),
    );
  }

  get filteredDiningHalls(): LocationDetails[] {
    const search = this.searchTerm.toLowerCase().trim();

    return this.locations()
      .filter((hall) => {
        const matchesSearch =
          hall.name.toLowerCase().includes(search) ||
          hall.location.toLowerCase().includes(search) ||
          hall.tags.some((tag) => tag.toLowerCase().includes(search));
        const matchesTag = !this.selectedTag || hall.tags.includes(this.selectedTag);

        return matchesSearch && matchesTag;
      })
      .sort((a, b) => b.averageRating - a.averageRating);
  }

  getTodayHours(hall: LocationDetails): LocationHours | undefined {
    const today = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(new Date());

    return hall.hours.find((hours) => hours.day === today);
  }

  logout(): void {
    document.cookie = 'mockAuth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    sessionStorage.removeItem('currentAccount');
    sessionStorage.removeItem('accessToken');

    this.router.navigate(['/login']);
  }
}

export default Locations;
