import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import type { Review } from '../../types/review';

@Component({
  selector: 'app-review-item',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule],
  templateUrl: './review-item.html',
  styleUrl: './review-item.css',
})
export class ReviewItem {
  @Input({ required: true }) review!: Review;
  @Input() canEdit = false;
  @Output() editRequested = new EventEmitter<Review>();
}
