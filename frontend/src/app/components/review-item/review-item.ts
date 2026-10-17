import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import type { Review } from '../../types/review';
import { apiBaseUrl } from '../../api/api-base-url';
import { PhotoViewerDialog } from '../photo-viewer-dialog/photo-viewer-dialog';

@Component({
  selector: 'app-review-item',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatDialogModule],
  templateUrl: './review-item.html',
  styleUrl: './review-item.css',
})
export class ReviewItem {
  private readonly dialog = inject(MatDialog);
  @Input({ required: true }) review!: Review;
  @Input() authorName = '';
  @Input() locationName = '';
  @Input() showLocation = false;
  @Input() canEdit = false;
  @Input() busy = false;
  @Output() deleteRequested = new EventEmitter<Review>();
  @Output() editRequested = new EventEmitter<Review>();

  photoUrl(photoId: string): string {
    return `${apiBaseUrl}/photos/${encodeURIComponent(photoId)}`;
  }

  get validPhotoIds(): string[] {
    const photoIds: unknown = this.review?.photoIds;
    return (Array.isArray(photoIds) ? photoIds : []).filter(
      (photoId): photoId is string => typeof photoId === 'string' && photoId.trim().length > 0
    );
  }

  openPhoto(photoId: string): void {
    if (!photoId.trim()) return;

    const description = 'Food photo attached to review';
    this.dialog.open(PhotoViewerDialog, {
      data: { imageUrl: this.photoUrl(photoId), description },
      maxWidth: '95vw',
      maxHeight: '95vh',
      ariaLabel: description,
    });
  }
}
