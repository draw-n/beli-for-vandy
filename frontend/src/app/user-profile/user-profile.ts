import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Account } from '../types/auth';

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
  readonly account: Account | null = this.loadAccount();

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
