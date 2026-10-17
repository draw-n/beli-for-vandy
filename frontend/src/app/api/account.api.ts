import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Account,
  AccountCreateRequest,
  AccountDeleteRequest,
  AccountLoginRequest,
} from '../types/auth';
import { apiBaseUrl } from './api-base-url';

@Injectable({
  providedIn: 'root',
})
export class AccountApi {
  private readonly http = inject(HttpClient);
  private readonly accountsUrl = `${apiBaseUrl}/accounts`;

  getAll(): Observable<Account[]> {
    return this.http.get<Account[]>(this.accountsUrl);
  }

  create(request: AccountCreateRequest): Observable<Account> {
    return this.http.post<Account>(this.accountsUrl, request);
  }

  login(request: AccountLoginRequest): Observable<Account> {
    return this.http.post<Account>(`${this.accountsUrl}/login`, request);
  }

  delete(request: AccountDeleteRequest): Observable<void> {
    return this.http.delete<void>(this.accountsUrl, {
      body: request,
    });
  }
}
