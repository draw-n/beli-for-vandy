import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule
  ]
})
export class LoginComponent {
  private readonly router = inject(Router);

  username = '';
  password = '';

  onSubmit(): void {
    if (!this.username.trim() || !this.password) {
      return;
    }

    // Temporary frontend-only authentication.
    document.cookie = 'mockAuth=true; path=/; SameSite=Lax';

    this.router.navigate(['/dining-halls']);
  }
}