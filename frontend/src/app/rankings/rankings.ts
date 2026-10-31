import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RankingsStore } from './rankings.store';

@Component({
  selector: 'app-rankings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatCardModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatProgressSpinnerModule],
  templateUrl: './rankings.html',
  styleUrl: './rankings.css',
})
export class RankingsPage implements OnInit {
  readonly store = inject(RankingsStore);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  errorMessage = '';
  editingLocationId: string | null = null;
  editingRating: number | null = null;

  ngOnInit(): void {
    if (!sessionStorage.getItem('currentAccount') || !sessionStorage.getItem('accessToken')) {
      void this.router.navigate(['/login']); return;
    }
    this.load();
  }
  load(): void {
    this.errorMessage = '';
    this.store.load().subscribe({
      error: (e: unknown) => { this.errorMessage = this.store.errorMessage(e, 'load'); this.cdr.markForCheck(); },
    });
  }
  startEdit(locationId: string, currentRating?: number): void {
    this.editingLocationId = locationId; this.editingRating = currentRating ?? null; this.errorMessage = '';
  }
  cancelEdit(): void { this.editingLocationId = null; this.editingRating = null; }
  get validEditRating(): boolean {
    return this.editingRating !== null && this.editingRating >= 1 && this.editingRating <= 10;
  }
  save(locationId: string): void {
    if (!this.validEditRating || this.store.saving() === locationId) return;
    this.errorMessage = '';
    this.store.setRating(locationId, this.editingRating!).subscribe({
      next: () => { this.cancelEdit(); this.load(); },
      error: (e: unknown) => { this.errorMessage = this.store.errorMessage(e, 'save'); this.cdr.markForCheck(); },
    });
  }
}
