import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../auth/auth-api';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submitted = false;
  protected submitting = false;
  protected errorMessage = '';

  protected onSubmit(): void {
    if (this.submitting) {
      return;
    }

    this.submitted = false;
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const { email, password } = this.form.getRawValue();

    this.authApi.login(email, password).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage =
          error instanceof HttpErrorResponse && typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Unable to log in. Please try again.';
      },
    });
  }
}
