import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface PhotoViewerDialogData {
  imageUrl: string;
  description?: string;
}

@Component({
  selector: 'app-photo-viewer-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './photo-viewer-dialog.html',
  styleUrl: './photo-viewer-dialog.css',
})
export class PhotoViewerDialog {
  constructor(
    readonly dialogRef: MatDialogRef<PhotoViewerDialog>,
    @Inject(MAT_DIALOG_DATA) readonly data: PhotoViewerDialogData,
  ) {}
}
