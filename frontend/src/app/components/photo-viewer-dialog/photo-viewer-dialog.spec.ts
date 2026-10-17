import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { PhotoViewerDialog } from './photo-viewer-dialog';

describe('PhotoViewerDialog', () => {
  it('shows the selected image without changing its aspect ratio', () => {
    TestBed.configureTestingModule({
      imports: [PhotoViewerDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: MAT_DIALOG_DATA, useValue: { imageUrl: '/photos/photo-1', description: 'Commons lunch' } },
      ],
    });

    const fixture = TestBed.createComponent(PhotoViewerDialog);
    fixture.detectChanges();
    const image = fixture.nativeElement.querySelector('.photo-viewer img') as HTMLImageElement;

    expect(image.getAttribute('src')).toBe('/photos/photo-1');
    expect(image.getAttribute('alt')).toBe('Commons lunch');
    expect(getComputedStyle(image).objectFit).toBe('contain');
    expect(getComputedStyle(image).maxWidth).toBe('90vw');
    expect(getComputedStyle(image).maxHeight).toBe('85vh');
  });

  it('closes from the accessible close button', () => {
    const close = vi.fn();
    TestBed.configureTestingModule({
      imports: [PhotoViewerDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { imageUrl: '/photos/photo-1' } },
      ],
    });

    const fixture = TestBed.createComponent(PhotoViewerDialog);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.close-button') as HTMLButtonElement;

    expect(button.getAttribute('aria-label')).toBe('Close photo viewer');
    button.click();
    expect(close).toHaveBeenCalled();
  });
});

describe('PhotoViewerDialog Material dismissal defaults', () => {
  it('keeps Escape and backdrop closing enabled', () => {
    const config = new MatDialogConfig();
    expect(config.disableClose).toBe(false);
    expect(config.hasBackdrop).toBe(true);
  });
});
