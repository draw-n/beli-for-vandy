import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { AccountApi } from '../api/account.api';
import type { Account } from '../types/auth';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class Profile {
  account: Account | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly accountApi = inject(AccountApi);
  private readonly changeDetector = inject(ChangeDetectorRef);

  constructor() {
    const userId = this.route.snapshot.paramMap.get('id');

    if (userId) {
      this.loadUser(userId);
    } else {
      this.account = this.loadAccount();
    }
  }

  private loadUser(userId: string): void {
    this.accountApi.getAll().subscribe({
      next: (accounts) => {
        this.account =
          accounts.find((account) => account.uuid === userId) ?? null;

        this.changeDetector.markForCheck();
      },
      error: () => {
        this.account = null;
        this.changeDetector.markForCheck();
      },
    });
  }

  private loadAccount(): Account | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const accountJson = sessionStorage.getItem('currentAccount');

    if (!accountJson) {
      return null;
    }

    try {
      return JSON.parse(accountJson) as Account;
    } catch {
      sessionStorage.removeItem('currentAccount');
      return null;
    }
  }
}
