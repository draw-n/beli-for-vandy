import { Injectable, signal } from '@angular/core';
import type { Account, AccountLoginResponse } from './types/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly account = signal<Account | null>(this.readAccount());

  get token(): string | null {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem('accessToken');
  }

  get isAuthenticated(): boolean {
    return Boolean(this.token && this.account());
  }

  get isModerator(): boolean {
    const role = this.account()?.role;
    return role === 'moderator' || role === 'admin';
  }

  get isAdmin(): boolean {
    return this.account()?.role === 'admin';
  }

  setSession(response: AccountLoginResponse): void {
    const { access_token, token_type, expires_at, ...account } = response;
    void token_type;
    void expires_at;
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem('accessToken', access_token);
    sessionStorage.setItem('currentAccount', JSON.stringify(account));
    this.account.set(account);
  }

  clearSession(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('currentAccount');
    }
    if (typeof document !== 'undefined') {
      document.cookie = 'mockAuth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
    this.account.set(null);
  }

  private readAccount(): Account | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const value = JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null');
      return value && typeof value.uuid === 'string' ? value as Account : null;
    } catch {
      return null;
    }
  }
}
