import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { EMPTY, finalize, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';

import { FavoriteDishApi } from '../api/favorite-dish.api';
import type { FavoriteDishResponse } from '../types/favorite-dish';

@Injectable({ providedIn: 'root' })
export class FavoriteDishesStore {
  private readonly api = inject(FavoriteDishApi);
  readonly dishes = signal<FavoriteDishResponse[]>([]);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly pendingNames = signal<string[]>([]);
  private loadRequest?: Observable<FavoriteDishResponse[]>;
  private loadedAccountId: string | null = null;

  ensureLoaded(): Observable<FavoriteDishResponse[]> {
    const accountId = this.currentAccountId();
    if (!accountId || !sessionStorage.getItem('accessToken')) {
      return throwError(() => new Error('Sign in to access favorite dishes.'));
    }

    if (accountId !== this.loadedAccountId) {
      this.dishes.set([]);
      this.loaded.set(false);
      this.loadRequest = undefined;
      this.loadedAccountId = accountId;
    }
    if (this.loaded()) return of(this.dishes());
    if (this.loadRequest) return this.loadRequest;

    this.loading.set(true);
    this.loadRequest = this.api.getAll().pipe(
      tap((dishes) => {
        this.dishes.set(dishes);
        this.loaded.set(true);
      }),
      finalize(() => {
        this.loading.set(false);
        this.loadRequest = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.loadRequest;
  }

  isFavorite(name: string, locationId: string): boolean {
    const normalized = this.normalize(name);
    return this.dishes().some((dish) =>
      this.normalize(dish.name) === normalized &&
      (dish.location_id === locationId || !dish.location_id)
    );
  }

  isPending(name: string, locationId: string): boolean {
    return this.pendingNames().includes(this.pendingKey(name, locationId));
  }

  toggle(name: string, locationId: string, locationName: string): Observable<unknown> {
    const key = this.pendingKey(name, locationId);
    if (this.pendingNames().includes(key)) return EMPTY;

    this.pendingNames.update((names) => [...names, key]);
    const matchingDishes = this.dishes().filter((dish) =>
      this.normalize(dish.name) === this.normalize(name)
    );
    const favorite = matchingDishes.find((dish) => dish.location_id === locationId);
    const legacyFavorite = favorite ? undefined : matchingDishes.find((dish) => !dish.location_id);
    const update = favorite
      ? this.api.remove(favorite.uuid).pipe(
          tap(() => this.dishes.update((dishes) => dishes.filter((dish) => dish.uuid !== favorite.uuid))),
        )
      : this.api.add(name, locationId, locationName).pipe(
          tap((added) => {
            if (legacyFavorite) {
              this.dishes.update((dishes) => dishes.map((dish) =>
                dish.uuid === legacyFavorite.uuid ? added : dish
              ));
            } else if (!this.isFavorite(added.name, locationId)) {
              this.dishes.update((dishes) => [...dishes, added]);
            }
          }),
          map(() => undefined),
        );

    return update.pipe(
      finalize(() => this.pendingNames.set(this.pendingNames().filter((item) => item !== key))),
    );
  }

  errorMessage(error: unknown, action: string): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'Your session expired. Please log in again.';

      const detail = typeof error.error?.detail === 'string' ? error.error.detail : '';
      if (detail) return `Could not ${action} favorite dishes: ${detail}`;
      if (error.status === 0) return 'Could not connect to the server. Check that the backend is running.';
      return `Could not ${action} favorite dishes (HTTP ${error.status}). Please try again.`;
    }
    return `Could not ${action} favorite dishes. Please try again.`;
  }

  private currentAccountId(): string | null {
    try {
      const account = JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null');
      return typeof account?.uuid === 'string' ? account.uuid : null;
    } catch {
      return null;
    }
  }

  private normalize(name: string): string {
    return name.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private pendingKey(name: string, locationId: string): string {
    return `${locationId}:${this.normalize(name)}`;
  }
}
