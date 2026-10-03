import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AccountApi } from '../api/account.api';
import { AccountCreateRequest, AccountDeleteRequest } from '../types/auth';

@Component({
  selector: 'app-account',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly accountApi = inject(AccountApi);

  createRequest: AccountCreateRequest = this.emptyCreateRequest();

  deleteRequest: AccountDeleteRequest = {
    email: '',
    password: '',
  };

  createMessage = '';
  deleteMessage = '';

  creating = false;
  deleting = false;

  createAccount(): void {
    this.creating = true;
    this.createMessage = '';

    const request = {
      ...this.createRequest,
      year_graduation: this.createRequest.year_graduation || null,
    };

    this.accountApi.create(request).subscribe({
      next: (account) => {
        this.createMessage = `Account created for ${account.username}.`;
        this.createRequest = this.emptyCreateRequest();
        this.creating = false;
      },

      error: (error: HttpErrorResponse) => {
        this.createMessage = this.errorMessage(error, 'Could not create the account.');
        this.creating = false;
      },
    });
  }

  deleteAccount(): void {
    this.deleting = true;
    this.deleteMessage = '';

    this.accountApi.delete(this.deleteRequest).subscribe({
      next: () => {
        this.deleteMessage = 'Account deleted.';

        this.deleteRequest = {
          email: '',
          password: '',
        };

        this.deleting = false;
      },

      error: (error: HttpErrorResponse) => {
        this.deleteMessage = this.errorMessage(error, 'Could not delete the account.');
        this.deleting = false;
      },
    });
  }

  private emptyCreateRequest(): AccountCreateRequest {
    return {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      year_graduation: null,
      type: 'student',
      home_city: '',
    };
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    const detail = error.error?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    return fallback;
  }
}
