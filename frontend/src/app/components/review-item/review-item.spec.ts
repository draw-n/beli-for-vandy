import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReviewItem } from './review-item';
import type { Review } from '../../types/review';

const review: Review = {
  uuid: 'review-1',
  userId: 'author',
  locationId: 'hall',
  rating: 8,
  reviewText: 'Great lunch',
  mealType: 'Lunch',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('Reusable review item', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
  });

  it('renders without storage or HTTP providers and is read-only by default', () => {
    const fixture = TestBed.createComponent(ReviewItem);

    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Great lunch');
    expect(fixture.nativeElement.textContent).toContain('author');

    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Options for your review"]'
      )
    ).toBeNull();
  });

  it('links the author to their profile by default', () => {
    const fixture = TestBed.createComponent(ReviewItem);

    fixture.componentRef.setInput('review', review);
    fixture.componentRef.setInput('authorName', 'Ava Martin');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector(
      '[aria-label="View profile for Ava Martin"]'
    ) as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/profile/author');
  });

  it('links the dining spot when displaying a review on a user profile', () => {
    const fixture = TestBed.createComponent(ReviewItem);

    fixture.componentRef.setInput('review', review);
    fixture.componentRef.setInput('showLocation', true);
    fixture.componentRef.setInput('locationName', 'Commons');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector(
      '[aria-label="View dining spot Commons"]'
    ) as HTMLAnchorElement | null;

    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/locations/hall');
    expect(link!.textContent).toContain('Commons');
  });

  it.each(['Edit', 'Delete'])(
    'emits the selected review through the %s menu option',
    async (action) => {
      const fixture = TestBed.createComponent(ReviewItem);

      fixture.componentRef.setInput('review', review);
      fixture.componentRef.setInput('canEdit', true);

      const edit = vi.fn();

      (
        action === 'Edit'
          ? fixture.componentInstance.editRequested
          : fixture.componentInstance.deleteRequested
      ).subscribe(edit);

      fixture.detectChanges();

      fixture.nativeElement
        .querySelector('[aria-label="Options for your review"]')
        .click();

      fixture.detectChanges();
      await fixture.whenStable();

      const items = Array.from(
        document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      );

      expect(items.length).toBe(2);

      items
        .find(
          item =>
            item.querySelector('span')?.textContent?.trim() === action
        )!
        .click();

      expect(edit).toHaveBeenCalledWith(review);
    }
  );
});