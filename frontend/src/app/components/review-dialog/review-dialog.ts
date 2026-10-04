import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { ReviewApi } from '../../api/review.api';

interface ReviewDialogData {
  locationId: string;
  locationName: string;
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
  ],
  templateUrl: './review-dialog.html',
  styleUrl: './review-dialog.css',
})
export class ReviewDialog {
  private readonly reviewApi = inject(ReviewApi);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  rating: number | null = null;
  reviewText = '';
  mealType = '';

  mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  constructor(
    private dialogRef: MatDialogRef<ReviewDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: ReviewDialogData,
  ) {}

  get validRating(): boolean {
    return this.rating !== null && Number.isInteger(this.rating) && this.rating >= 1 && this.rating <= 10;
  }

  submitReview(): void {
    if (this.saving() || this.rating === null || this.rating < 1 || this.rating > 10 || !Number.isInteger(this.rating) || !this.mealType) {
      return;
    }

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

    const now = new Date().toISOString();
    this.saving.set(true);
    this.errorMessage.set('');
    this.dialogRef.disableClose = true;
    this.reviewApi.create({
      user_id: userId,
      location_id: this.data.locationId,
      rating: this.rating,
      note: this.reviewText.trim(),
      meal_type: this.mealType,
      created_at: now,
      updated_at: now,
      photo_ids: [],
    }).subscribe({
      next: (review) => this.dialogRef.close(review),
      error: () => {
        this.saving.set(false);
        this.dialogRef.disableClose = false;
        this.errorMessage.set('Could not save your review. Please try again.');
      },
    });
  }
}
