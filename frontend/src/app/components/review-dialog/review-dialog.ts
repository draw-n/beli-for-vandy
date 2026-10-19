import type { Review } from '../../types/review';
import { Component, Inject, inject, signal, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { concatMap, map, of, switchMap, tap, toArray } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ReviewApi } from '../../api/review.api';
import { apiBaseUrl } from '../../api/api-base-url';

interface ReviewDialogData {
  locationId: string;
  locationName: string;
  review?: Review;
}

interface SelectedPhoto {
  file: File;
  previewUrl: string;
  uploadedId?: string;
}

@Component({
  selector: 'app-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './review-dialog.html',
  styleUrl: './review-dialog.css',
})
export class ReviewDialog implements OnDestroy {
  private readonly reviewApi = inject(ReviewApi);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly selectedPhotos: SelectedPhoto[] = [];
  readonly keptPhotoIds: string[];
  readonly apiBaseUrl = apiBaseUrl;
  readonly maxPhotos = 3;
  readonly maxFileSize = 5 * 1024 * 1024;
  readonly allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  rating: number | null = null;
  reviewText = '';
  mealType = '';
  favoriteDishesText = '';

  mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  constructor(
    private dialogRef: MatDialogRef<ReviewDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: ReviewDialogData,
  ) {
    this.keptPhotoIds = [...(data.review?.photoIds ?? [])];
    if (data.review) {
      this.rating = data.review.rating;
      this.reviewText = data.review.reviewText;
      this.mealType = data.review.mealType;
      this.favoriteDishesText = (data.review.favoriteDishes ?? []).join(', ');
    }
  }

  ngOnDestroy(): void {
    this.selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }

  get validRating(): boolean {
    return this.rating !== null && Number.isInteger(this.rating) && this.rating >= 1 && this.rating <= 10;
  }

  get photoCount(): number {
    return this.keptPhotoIds.length + this.selectedPhotos.length;
  }

  selectPhotos(event: Event): void {
    const input = event.target as HTMLInputElement;
    for (const file of Array.from(input.files ?? [])) {
      if (!this.allowedTypes.includes(file.type)) {
        this.errorMessage.set('Choose a JPEG, PNG, or WebP image.');
        continue;
      }
      if (file.size > this.maxFileSize) {
        this.errorMessage.set('Each image must be 5 MB or smaller.');
        continue;
      }
      if (this.photoCount >= this.maxPhotos) {
        this.errorMessage.set('You can attach up to 3 photos per review.');
        break;
      }
      this.selectedPhotos.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    input.value = '';
  }

  removeSelectedPhoto(index: number): void {
    const [photo] = this.selectedPhotos.splice(index, 1);
    if (photo) URL.revokeObjectURL(photo.previewUrl);
  }

  removeKeptPhoto(photoId: string): void {
    const index = this.keptPhotoIds.indexOf(photoId);
    if (index >= 0) this.keptPhotoIds.splice(index, 1);
  }

  submitReview(): void {
    if (this.saving() || !this.validRating || !this.mealType) return;

    let userId: string | undefined;
    try {
      userId = JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null')?.uuid;
    } catch {
      // Missing or malformed account data requires signing in again.
    }
    if (!userId) {
      this.errorMessage.set('Please log in before submitting a review.');
      return;
    }
    if (this.data.review && this.data.review.userId !== userId) {
      this.errorMessage.set('You can only edit your own reviews.');
      return;
    }

    const photosChanged = !this.data.review
      ? this.selectedPhotos.length > 0
      : this.selectedPhotos.length > 0 ||
        this.keptPhotoIds.length !== (this.data.review.photoIds ?? []).length ||
        this.keptPhotoIds.some((id, index) => id !== (this.data.review?.photoIds ?? [])[index]);
    if (photosChanged && !sessionStorage.getItem('accessToken')) {
      this.errorMessage.set('Please log in again before adding or changing photos.');
      return;
    }

    const now = new Date().toISOString();
    this.saving.set(true);
    this.errorMessage.set('');
    this.dialogRef.disableClose = true;
    const fields = {
      rating: this.rating!,
      note: this.reviewText.trim(),
      meal_type: this.mealType,
      favorite_dishes: this.favoriteDishesText.split(',')
        .map((dish) => dish.trim())
        .filter(Boolean)
        .map((dish) => dish.charAt(0).toUpperCase() + dish.slice(1).toLowerCase()),
      updated_at: now,
    };

    this.uploadNewPhotos().pipe(
      switchMap((uploadedIds) => {
        if (this.data.review) {
          const update = photosChanged
            ? { ...fields, photo_ids: [...this.keptPhotoIds, ...uploadedIds] }
            : fields;
          return this.reviewApi.update(this.data.review.uuid, update);
        }
        return this.reviewApi.create({
          ...fields,
          user_id: userId!,
          location_id: this.data.locationId,
          created_at: now,
          photo_ids: uploadedIds,
        });
      }),
    ).subscribe({
      next: (review) => this.dialogRef.close(review),
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        if (error.status === 401) {
          this.errorMessage.set('Your session has expired. Please log in again.');
        } else if (this.selectedPhotos.some((photo) => photo.uploadedId)) {
          this.errorMessage.set('Could not save your review. Uploaded photos remain pending; retry to reuse them.');
        } else {
          this.errorMessage.set('Could not save your review or upload photos. Please try again.');
        }
      },
    });
  }

  private uploadNewPhotos() {
    return of(...this.selectedPhotos).pipe(
      concatMap((photo) => {
        if (photo.uploadedId) return of(photo.uploadedId);
        return this.reviewApi.uploadPhoto(photo.file).pipe(
          tap((response) => photo.uploadedId = response.uuid),
          map((response) => response.uuid),
        );
      }),
      toArray(),
    );
  }
}
