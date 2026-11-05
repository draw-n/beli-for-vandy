import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../auth.service';
import { AccountApi } from '../api/account.api';
import type { Account } from '../types/auth';
import { ModerationApi, type AuditRecord, type Report, type ReportStatus, type ReportTargetType } from '../api/moderation.api';

@Component({
  selector: 'app-moderation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatToolbarModule],
  templateUrl: './moderation.html',
  styleUrl: './moderation.css',
})
export class ModerationDashboard implements OnDestroy {
  private readonly api = inject(ModerationApi);
  private readonly auth = inject(AuthService);
  private readonly accountApi = inject(AccountApi);
  private readonly router = inject(Router);
  readonly reports = signal<Report[]>([]);
  readonly audit = signal<AuditRecord[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly errorMessage = signal('');
  readonly loading = signal(false);
  targetType: ReportTargetType | '' = '';
  reasonFilter = '';
  resolution = '';
  selectedAction: ReportStatus = 'dismissed';
  blockEmail = '';
  blockDomain = '';
  blockUsername = '';
  blockReason = '';
  private readonly refreshInterval = typeof window === 'undefined'
    ? undefined
    : window.setInterval(() => this.loadQueue(), 15000);
  private readonly focusListener = typeof window === 'undefined'
    ? undefined
    : () => this.loadQueue();

  constructor() {
    this.loadQueue();
    this.loadAudit();
    if (this.auth.isAdmin) this.loadAccounts();
    if (this.focusListener) window.addEventListener('focus', this.focusListener);
  }

  get isAdmin(): boolean { return this.auth.isAdmin; }

  loadQueue(): void {
    this.loading.set(true);
    this.api.getQueue(1, 25, this.targetType || undefined, this.reasonFilter, false).subscribe({
      next: (response) => { this.reports.set(response.items); this.loading.set(false); },
      error: (error) => this.handleError(error),
    });
  }

  resolve(report: Report): void {
    if (!this.resolution.trim()) {
      this.errorMessage.set('Enter a resolution before resolving a report.');
      return;
    }
    this.api.resolveReport(report.uuid, this.selectedAction, this.resolution.trim()).subscribe({
      next: () => { this.resolution = ''; this.loadQueue(); this.loadAudit(); },
      error: (error) => this.handleError(error),
    });
  }

  moderate(report: Report, action: 'hide' | 'restore' | 'remove'): void {
    const reason = window.prompt(`Reason for ${action}ing this ${report.target_type}:`, '');
    if (reason === null || !reason.trim()) return;
    const request = report.target_type === 'review'
      ? this.api.moderateReview(report.target_id, action, reason.trim())
      : report.target_type === 'photo'
        ? this.api.moderatePhoto(report.target_id, action, reason.trim())
        : null;
    if (!request) return;
    request.subscribe({
      next: () => { this.loadQueue(); this.loadAudit(); },
      error: (error) => this.handleError(error),
    });
  }

  suspend(accountId: string, suspended: boolean): void {
    const reason = window.prompt(suspended ? 'Reason for suspension:' : 'Reason for unsuspension:', '');
    if (reason === null || !reason.trim()) return;
    const request = suspended
      ? this.api.suspendAccount(accountId, reason.trim())
      : this.api.unsuspendAccount(accountId, reason.trim());
    request.subscribe({
      next: () => { this.loadAccounts(); this.loadAudit(); },
      error: (error) => this.handleError(error),
    });
  }

  createBlock(): void {
    if ((!this.blockEmail.trim() && !this.blockDomain.trim() && !this.blockUsername.trim()) || !this.blockReason.trim()) {
      this.errorMessage.set('Provide a block value and a reason.');
      return;
    }
    this.api.createBlock({
      email: this.blockEmail.trim() || null,
      domain: this.blockDomain.trim() || null,
      username: this.blockUsername.trim() || null,
      reason: this.blockReason.trim(),
    }).subscribe({
      next: () => { this.blockEmail = ''; this.blockDomain = ''; this.blockUsername = ''; this.blockReason = ''; this.loadAudit(); },
      error: (error) => this.handleError(error),
    });
  }

  logout(): void {
    this.auth.clearSession();
    void this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval !== undefined) window.clearInterval(this.refreshInterval);
    if (this.focusListener) window.removeEventListener('focus', this.focusListener);
  }

  private loadAudit(): void {
    this.api.getAuditLog().subscribe({
      next: (records) => this.audit.set(records),
      error: (error) => this.handleError(error),
    });
  }

  private loadAccounts(): void {
    this.accountApi.getAll().subscribe({
      next: (accounts) => this.accounts.set(accounts),
      error: (error) => this.handleError(error),
    });
  }

  private handleError(error: unknown): void {
    const response = error as HttpErrorResponse;
    this.loading.set(false);
    this.errorMessage.set(response.status === 403
      ? 'You do not have permission for this action.'
      : response.status === 409
        ? response.error?.detail ?? 'This action conflicts with the current account or moderation state.'
        : 'The moderation request could not be completed.');
  }
}
