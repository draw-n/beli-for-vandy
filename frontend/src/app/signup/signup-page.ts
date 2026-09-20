import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthApi } from '../auth/auth-api';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmation = control.get('confirmPassword')?.value;

  return password === confirmation ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-page.html',
})
export class SignupPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApi);

  protected readonly form = this.formBuilder.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(3)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

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

    this.authApi.signup(email, password).subscribe({
      next: () => {
        this.submitting = false;
        this.submitted = true;
      },
      error: (error: unknown) => {
        this.submitting = false;
        this.errorMessage =
          error instanceof HttpErrorResponse && typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Unable to create your account. Please try again.';
      },
    });
  }
}
