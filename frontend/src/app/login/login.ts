import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountApi } from '../api/account.api';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ]
})
export class LoginComponent {
  private readonly router = inject(Router);
  private readonly accountApi = inject(AccountApi);

  username = '';
  password = '';
  loginMessage = '';
  loggingIn = false;

  onSubmit(): void {
    if (!this.username.trim() || !this.password) {
      return;
    }

    this.loggingIn = true;
    this.loginMessage = '';

    this.accountApi.login({
      username: this.username,
      password: this.password,
    }).subscribe({
      next: (account) => {
        document.cookie = `mockAuth=${account.uuid}; path=/; SameSite=Lax`;
        sessionStorage.setItem('currentAccount', JSON.stringify(account));
        this.router.navigate(['/locations']);
      },
      error: (error: HttpErrorResponse) => {
        this.loginMessage = error.error?.detail ?? 'Could not log in.';
        this.loggingIn = false;
      },
    });
  }
}