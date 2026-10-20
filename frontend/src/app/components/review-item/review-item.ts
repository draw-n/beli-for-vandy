import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { switchMap } from 'rxjs';
import type { Review } from '../../types/review';
import { apiBaseUrl } from '../../api/api-base-url';
import { PhotoViewerDialog } from '../photo-viewer-dialog/photo-viewer-dialog';
import { ReportReviewDialog } from '../report-review-dialog/report-review-dialog';
import { ModerationApi } from '../../api/moderation.api';
import { AuthService } from '../../auth.service';
import { FavoriteDishesStore } from '../../favorite-dishes/favorite-dishes.store';

@Component({
  selector: 'app-review-item',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatDialogModule],
  templateUrl: './review-item.html',
  styleUrl: './review-item.css',
})
export class ReviewItem implements OnInit {
  private readonly dialog = inject(MatDialog);
  readonly favorites = inject(FavoriteDishesStore);
  private readonly moderationApi = inject(ModerationApi, { optional: true });
  private readonly auth = inject(AuthService);
  @Input({ required: true }) review!: Review;
  @Input() authorName = '';
  @Input() locationName = '';
  @Input() showLocation = false;
  @Input() canEdit = false;
  @Input() busy = false;
  @Output() deleteRequested = new EventEmitter<Review>();
  @Output() editRequested = new EventEmitter<Review>();
  favoriteError = '';

  ngOnInit(): void {
    if (this.canFavoriteDishes && this.validFavoriteDishes.length) {
      this.favorites.ensureLoaded().subscribe({
        error: (error: unknown) => this.favoriteError = this.favorites.errorMessage(error, 'load'),
      });
    }
  }

  get canFavoriteDishes(): boolean {
    if (typeof sessionStorage === 'undefined' || !sessionStorage.getItem('accessToken')) return false;
    try {
      const account = JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null');
      return typeof account?.uuid === 'string' && account.uuid.length > 0;
    } catch {
      return false;
    }
  }
  reportMessage = '';

  get canReport(): boolean {
    return this.auth.isAuthenticated;
  }

  photoUrl(photoId: string): string {
    return `${apiBaseUrl}/photos/${encodeURIComponent(photoId)}`;
  }

  get validPhotoIds(): string[] {
    const photoIds: unknown = this.review?.photoIds;
    return (Array.isArray(photoIds) ? photoIds : []).filter(
      (photoId): photoId is string => typeof photoId === 'string' && photoId.trim().length > 0
    );
  }

  get validFavoriteDishes(): string[] {
    const dishes: unknown = this.review?.favoriteDishes;
    return (Array.isArray(dishes) ? dishes : []).filter(
      (dish): dish is string => typeof dish === 'string' && dish.trim().length > 0
    ).map((dish) => {
      const trimmed = dish.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    });
  }

  toggleFavorite(dish: string): void {
    this.favoriteError = '';
    this.favorites.ensureLoaded().pipe(
      switchMap(() => this.favorites.toggle(
        dish,
        this.review.locationId,
        this.locationName || this.review.locationId,
      )),
    ).subscribe({
      error: (error: unknown) => this.favoriteError = this.favorites.errorMessage(error, 'update'),
    });
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

  reportReview(): void {
    if (!this.moderationApi) {
      this.reportMessage = 'Please sign in before reporting a review.';
      return;
    }
    const reportDialog = this.dialog.open(ReportReviewDialog, {
      width: 'min(92vw, 480px)',
      data: { reviewId: this.review.uuid },
    });
    reportDialog.afterClosed().subscribe((reason: string | undefined) => {
      if (!reason) return;
      this.reportMessage = '';
      this.moderationApi?.createReport('review', this.review.uuid, reason).subscribe({
        next: () => { this.reportMessage = 'Report submitted.'; },
        error: (error: { error?: { detail?: string } }) => {
          this.reportMessage = error.error?.detail ?? 'Could not submit report.';
        },
      });
    });
  }
}
