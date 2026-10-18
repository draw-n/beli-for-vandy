import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-report-review-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Report review</h2>
    <mat-dialog-content>
      <p>Tell us why you are reporting this review.</p>
      <mat-form-field appearance="outline">
        <mat-label>Reason</mat-label>
        <textarea
          matInput
          [(ngModel)]="reason"
          rows="4"
          maxlength="500"
          required
        ></textarea>
        <mat-hint align="end">{{ reason.length }}/500</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button type="button" [disabled]="!reason.trim()" (click)="dialogRef.close(reason.trim())">
        Submit report
      </button>
    </mat-dialog-actions>
  `,
})
export class ReportReviewDialog {
  reason = '';

  constructor(
    readonly dialogRef: MatDialogRef<ReportReviewDialog>,
    @Inject(MAT_DIALOG_DATA) readonly data: { reviewId: string },
  ) {}
}
