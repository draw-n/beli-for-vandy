import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { apiBaseUrl } from './api-base-url';
import type { Account } from '../types/auth';

export type ReportTargetType = 'review' | 'photo' | 'account';
export type ReportStatus = 'open' | 'skipped' | 'dismissed' | 'resolved' | 'escalated';

export interface Report {
  uuid: string;
  target_type: ReportTargetType;
  target_id: string;
  reporter_user_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  target?: Record<string, unknown> | null;
  history?: AuditRecord[];
}

export interface AuditRecord {
  uuid: string;
  action: string;
  actor_user_id: string;
  target_type: string;
  target_id: string;
  reason?: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface QueueResponse {
  page: number;
  page_size: number;
  items: Report[];
}

export interface AccountBlock {
  uuid: string;
  email?: string | null;
  domain?: string | null;
  username?: string | null;
  reason: string;
  expires_at?: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ModerationApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiBaseUrl;

  createReport(target_type: ReportTargetType, target_id: string, reason: string) {
    return this.http.post<Report>(`${this.baseUrl}/reports`, { target_type, target_id, reason });
  }

  getQueue(page = 1, pageSize = 25, targetType?: ReportTargetType, reason?: string, newestFirst = false) {
    let params = new HttpParams().set('page', page).set('page_size', pageSize).set('newest_first', newestFirst);
    if (targetType) params = params.set('target_type', targetType);
    if (reason?.trim()) params = params.set('reason', reason.trim());
    return this.http.get<QueueResponse>(`${this.baseUrl}/moderation/queue`, { params });
  }

  getReport(reportId: string) {
    return this.http.get<Report>(`${this.baseUrl}/moderation/reports/${encodeURIComponent(reportId)}`);
  }

  resolveReport(reportId: string, action: ReportStatus, resolution: string) {
    return this.http.post<Report>(
      `${this.baseUrl}/moderation/reports/${encodeURIComponent(reportId)}/resolve`,
      { action, resolution },
    );
  }

  moderateReview(reviewId: string, action: 'hide' | 'restore' | 'remove', reason: string) {
    return this.http.post<Record<string, unknown>>(
      `${this.baseUrl}/moderation/reviews/${encodeURIComponent(reviewId)}/${action}`,
      { reason },
    );
  }

  moderatePhoto(photoId: string, action: 'hide' | 'restore' | 'remove', reason: string) {
    return this.http.post<Record<string, unknown>>(
      `${this.baseUrl}/moderation/photos/${encodeURIComponent(photoId)}/${action}`,
      { reason },
    );
  }

  suspendAccount(userId: string, reason: string, suspendedUntil?: string) {
    return this.http.post<Account>(`${this.baseUrl}/moderation/accounts/${encodeURIComponent(userId)}/suspend`, {
      reason,
      suspended_until: suspendedUntil || null,
    });
  }

  unsuspendAccount(userId: string, reason: string) {
    return this.http.post<Account>(`${this.baseUrl}/moderation/accounts/${encodeURIComponent(userId)}/unsuspend`, { reason });
  }

  createBlock(block: Omit<AccountBlock, 'uuid' | 'created_at'>) {
    return this.http.post<AccountBlock>(`${this.baseUrl}/moderation/account-blocks`, block);
  }

  deleteBlock(blockId: string, reason: string) {
    return this.http.delete<void>(`${this.baseUrl}/moderation/account-blocks/${encodeURIComponent(blockId)}`, {
      body: { reason },
    });
  }

  getAuditLog(page = 1, pageSize = 50, targetType?: string, targetId?: string) {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (targetType) params = params.set('target_type', targetType);
    if (targetId) params = params.set('target_id', targetId);
    return this.http.get<AuditRecord[]>(`${this.baseUrl}/admin/audit-log`, { params });
  }
}
