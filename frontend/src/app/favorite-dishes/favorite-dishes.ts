import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { FavoriteDishesStore } from './favorite-dishes.store';

@Component({
  selector: 'app-favorite-dishes',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './favorite-dishes.html',
  styleUrl: './favorite-dishes.css',
})
export class FavoriteDishesPage implements OnInit {
  readonly favorites = inject(FavoriteDishesStore);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);
  errorMessage = '';

  ngOnInit(): void {
    if (!sessionStorage.getItem('currentAccount') || !sessionStorage.getItem('accessToken')) {
      void this.router.navigate(['/login']);
      return;
    }
    this.load();
  }

  load(): void {
    this.errorMessage = '';
    this.favorites.ensureLoaded().subscribe({
      error: (error: unknown) => {
        this.errorMessage = this.favorites.errorMessage(error, 'load');
        this.changeDetector.markForCheck();
      },
    });
  }

  remove(name: string, locationId: string, locationName: string): void {
    this.errorMessage = '';
    this.favorites.toggle(name, locationId, locationName).subscribe({
      error: (error: unknown) => {
        this.errorMessage = this.favorites.errorMessage(error, 'remove');
        this.changeDetector.markForCheck();
      },
    });
  }
}
