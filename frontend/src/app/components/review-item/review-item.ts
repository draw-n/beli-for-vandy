import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type { Review } from '../../types/review';

@Component({
  selector: 'app-review-item',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule],
  templateUrl: './review-item.html',
  styleUrl: './review-item.css',
})
export class ReviewItem {
  @Input({ required: true }) review!: Review;
  @Input() authorName = '';
  @Input() locationName = '';
  @Input() showLocation = false;
  @Input() canEdit = false;
  @Input() busy = false;
  @Output() deleteRequested = new EventEmitter<Review>();
  @Output() editRequested = new EventEmitter<Review>();
}
