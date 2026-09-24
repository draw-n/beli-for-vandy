import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

interface RateReviewDialogData {
  diningHallId: string;
  diningHallName: string;
}

export interface ReviewFormResult {
  rating: number;
  reviewText: string;
  mealType: string;
  photos: File[];
}

interface PhotoPreview {
  file: File;
  url: string;
}

@Component({
  selector: 'app-rate-review-dialog',
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
  templateUrl: './rate-review-dialog.html',
  styleUrl: './rate-review-dialog.css',
})
export class RateReviewDialog {
  rating: number | null = null;
  reviewText = '';
  mealType = '';

  photoPreviews: PhotoPreview[] = [];

  mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  constructor(
    private dialogRef: MatDialogRef<RateReviewDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: RateReviewDialogData,
  ) {}

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files) {
      return;
    }

    const files = Array.from(input.files);

    for (const file of files) {
      // Only allow images
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const preview: PhotoPreview = {
        file,
        url: URL.createObjectURL(file),
      };

      this.photoPreviews.push(preview);
    }

    // Allows the same file to be selected again after removing it
    input.value = '';
  }

  removePhoto(index: number): void {
    URL.revokeObjectURL(this.photoPreviews[index].url);

    this.photoPreviews.splice(index, 1);
  }

  submitReview(): void {
    if (this.rating === null || this.rating < 1 || this.rating > 10 || !this.mealType) {
      return;
    }

    const result: ReviewFormResult = {
      rating: this.rating,
      reviewText: this.reviewText.trim(),
      mealType: this.mealType,
      photos: this.photoPreviews.map((preview) => preview.file),
    };

    this.dialogRef.close(result);
  }
}
