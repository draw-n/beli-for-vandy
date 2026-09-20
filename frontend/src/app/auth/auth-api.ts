import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Account {
  id: string;
  email: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  signup(email: string, password: string): Observable<Account> {
    return this.http.post<Account>('/api/auth/signup', { email, password });
  }

  login(email: string, password: string): Observable<Account> {
    return this.http.post<Account>(
      '/api/auth/login',
      { email, password },
      { withCredentials: true },
    );
  }
}
