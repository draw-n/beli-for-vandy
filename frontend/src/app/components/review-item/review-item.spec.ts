import { TestBed } from '@angular/core/testing';
import { ReviewItem } from './review-item';
import type { Review } from '../../types/review';

const review: Review = {
  uuid: 'review-1', userId: 'author', locationId: 'hall', rating: 8,
  reviewText: 'Great lunch', mealType: 'Lunch',
  createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
};

describe('Reusable review item', () => {
  it('renders without routing, storage or HTTP providers and is read-only by default', () => {
    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Great lunch');
    expect(fixture.nativeElement.textContent).toContain('author');
    expect(fixture.nativeElement.querySelector('[aria-label="Options for your review"]')).toBeNull();
  });

  it('emits the selected review through the edit menu', async () => {
    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', review);
    fixture.componentRef.setInput('canEdit', true);
    const edit = vi.fn();
    fixture.componentInstance.editRequested.subscribe(edit);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Options for your review"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    (document.querySelector('[role="menuitem"]') as HTMLButtonElement).click();
    expect(edit).toHaveBeenCalledWith(review);
  });
});
