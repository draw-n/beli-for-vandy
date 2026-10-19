import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReviewItem } from './review-item';
import type { Review } from '../../types/review';
import { apiBaseUrl } from '../../api/api-base-url';
import { MatDialog } from '@angular/material/dialog';
import { PhotoViewerDialog } from '../photo-viewer-dialog/photo-viewer-dialog';
import { of } from 'rxjs';
import { authInterceptor } from '../../auth.interceptor';

const review: Review = {
  uuid: 'review-1',
  userId: 'author',
  locationId: 'hall',
  rating: 8,
  reviewText: 'Great lunch',
  mealType: 'Lunch',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  favoriteDishes: ['Mac and cheese'],
};

describe('Reusable review item', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    sessionStorage.removeItem('currentAccount');
    sessionStorage.removeItem('accessToken');
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    sessionStorage.removeItem('currentAccount');
    sessionStorage.removeItem('accessToken');
  });

  it('renders without storage or HTTP providers and is read-only by default', () => {
    const fixture = TestBed.createComponent(ReviewItem);

    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Great lunch');
    expect(fixture.nativeElement.textContent).toContain('author');
    expect(fixture.nativeElement.textContent).toContain('8.0');
    expect(fixture.nativeElement.querySelector('.review-photos')).toBeNull();

    expect(
      fixture.nativeElement.querySelector(
        '[aria-label="Options for your review"]'
      )
    ).toBeNull();
  });

  it('renders one review photo using the API base URL', () => {
    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', { ...review, photoIds: ['photo 1'] });
    fixture.detectChanges();

    const images = fixture.nativeElement.querySelectorAll('.review-photos img') as NodeListOf<HTMLImageElement>;
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe(`${apiBaseUrl}/photos/photo%201`);
    expect(images[0].getAttribute('loading')).toBe('lazy');
    expect(images[0].getAttribute('alt')).toBe('Food photo attached to review');
  });

  it('renders every photo attached to a review', () => {
    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', { ...review, photoIds: ['photo-1', 'photo-2'] });
    fixture.detectChanges();

    const images = fixture.nativeElement.querySelectorAll('.review-photos img') as NodeListOf<HTMLImageElement>;
    expect(Array.from(images, image => image.getAttribute('src'))).toEqual([
      `${apiBaseUrl}/photos/photo-1`,
      `${apiBaseUrl}/photos/photo-2`,
    ]);
  });

  it('renders favorite dishes on separate lines without commas and omits them when empty', () => {
    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', { ...review, favoriteDishes: ['tACos', 'bROWNies'] });
    fixture.detectChanges();

    const dishes = fixture.nativeElement.querySelectorAll('.favorite-dish-name');
    expect(Array.from(dishes, (dish: Element) => dish.textContent?.trim())).toEqual(['Tacos', 'Brownies']);
    const text = fixture.nativeElement.querySelector('.favorite-dishes')?.textContent
      .replace(/\s+/g, ' ')
      .trim();
    expect(text).toBe('Favorite dishes: TacosBrownies');
    expect(getComputedStyle(dishes[0]).display).toBe('block');
    expect(getComputedStyle(dishes[1]).display).toBe('block');

    fixture.componentRef.setInput('review', { ...review, favoriteDishes: [] });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.favorite-dishes')).toBeNull();
  });

  it('lets a logged-in user heart and unheart a dish from a review', () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'user-1' }));
    sessionStorage.setItem('accessToken', 'signed-token');
    const fixture = TestBed.createComponent(ReviewItem);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();

    const load = http.expectOne(`${apiBaseUrl}/favorite-dishes/`);
    expect(load.request.headers.get('Authorization')).toBe('Bearer signed-token');
    load.flush([]);
    fixture.detectChanges();

    const heart = fixture.nativeElement.querySelector('.favorite-dish-name button') as HTMLButtonElement;
    expect(heart.getAttribute('aria-label')).toBe('Add Mac and cheese to your favorite dishes');
    heart.click();

    const add = http.expectOne(`${apiBaseUrl}/favorite-dishes/`);
    expect(add.request.body).toEqual({
      name: 'Mac and cheese',
      location_id: 'hall',
      location_name: 'hall',
    });
    add.flush({
      uuid: 'dish-1', name: 'Mac and cheese', location_id: 'hall', location_name: 'hall',
      created_at: '2026-10-18T12:00:00Z',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.favorite-dish-name button')?.getAttribute('aria-label'))
      .toBe('Remove Mac and cheese from your favorite dishes');

    (fixture.nativeElement.querySelector('.favorite-dish-name button') as HTMLButtonElement).click();
    const remove = http.expectOne(`${apiBaseUrl}/favorite-dishes/dish-1`);
    remove.flush(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.favorite-dish-name button')?.getAttribute('aria-label'))
      .toBe('Add Mac and cheese to your favorite dishes');
  });

  it('shows the server reason when saving a favorite dish fails', () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'user-1' }));
    sessionStorage.setItem('accessToken', 'signed-token');
    const fixture = TestBed.createComponent(ReviewItem);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    http.expectOne(`${apiBaseUrl}/favorite-dishes/`).flush([]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.favorite-dish-name button') as HTMLButtonElement).click();
    http.expectOne(`${apiBaseUrl}/favorite-dishes/`).flush(
      { detail: 'Database is unavailable.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Database is unavailable.');
  });

  it('shows legacy saved dishes as hearted and assigns their hall when selected on a review', () => {
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'user-1' }));
    sessionStorage.setItem('accessToken', 'signed-token');
    const fixture = TestBed.createComponent(ReviewItem);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    http.expectOne(`${apiBaseUrl}/favorite-dishes/`).flush([{
      uuid: 'legacy-dish',
      name: 'Mac and cheese',
      location_id: null,
      location_name: null,
      created_at: '2026-10-18T12:00:00Z',
    }]);
    fixture.detectChanges();

    const heart = fixture.nativeElement.querySelector('.favorite-dish-name button') as HTMLButtonElement;
    expect(heart.getAttribute('aria-pressed')).toBe('true');
    heart.click();

    const assign = http.expectOne(`${apiBaseUrl}/favorite-dishes/`);
    expect(assign.request.body.location_id).toBe('hall');
    assign.flush({
      uuid: 'legacy-dish',
      name: 'Mac and cheese',
      location_id: 'hall',
      location_name: 'hall',
      created_at: '2026-10-18T12:00:00Z',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.favorite-dish-name button')?.getAttribute('aria-pressed'))
      .toBe('true');
  });

  it('renders normally when photoIds is empty or missing', () => {
    for (const photoIds of [[], undefined]) {
      const fixture = TestBed.createComponent(ReviewItem);
      fixture.componentRef.setInput('review', { ...review, photoIds });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.review-photos')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Great lunch');
      expect(fixture.nativeElement.textContent).toContain('8.0');
    }
  });

  it('opens the photo viewer with the selected review photo URL', () => {
    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', { ...review, photoIds: ['food-photo'] });
    fixture.detectChanges();
    const openDialog = vi.spyOn(
      (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog,
      'open'
    );

    const thumbnail = fixture.nativeElement.querySelector('.photo-thumbnail') as HTMLButtonElement;
    expect(thumbnail.tagName).toBe('BUTTON');
    expect(thumbnail.getAttribute('aria-label')).toBe('View larger food photo');
    thumbnail.click();

    expect(openDialog).toHaveBeenCalledWith(PhotoViewerDialog, expect.objectContaining({
      data: {
        imageUrl: `${apiBaseUrl}/photos/food-photo`,
        description: 'Food photo attached to review',
      },
    }));
    expect(openDialog.mock.calls[0][1]?.disableClose).toBeUndefined();
  });

  it('ignores empty or invalid photo IDs', () => {
    for (const photoIds of [
      ['', null, undefined] as unknown as string[],
      'not-an-array' as unknown as string[],
    ]) {
      const fixture = TestBed.createComponent(ReviewItem);
      fixture.componentRef.setInput('review', { ...review, photoIds });
      fixture.detectChanges();
      const openDialog = vi.spyOn(
        (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog,
        'open'
      );

      expect(fixture.nativeElement.querySelector('.review-photos')).toBeNull();
      fixture.componentInstance.openPhoto('');
      expect(openDialog).not.toHaveBeenCalled();
    }
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

  it('submits a review report with the authenticated request', () => {
    sessionStorage.setItem('accessToken', 'signed-token');
    sessionStorage.setItem('currentAccount', JSON.stringify({ uuid: 'reporter' }));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    const fixture = TestBed.createComponent(ReviewItem);
    fixture.componentRef.setInput('review', review);
    fixture.detectChanges();
    vi.spyOn(
      (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog,
      'open',
    ).mockReturnValue({
      afterClosed: () => of('Inappropriate content'),
    } as ReturnType<MatDialog['open']>);

    fixture.componentInstance.reportReview();

    const request = TestBed.inject(HttpTestingController).expectOne(`${apiBaseUrl}/reports`);
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer signed-token');
    expect(request.request.body).toEqual({
      target_type: 'review',
      target_id: 'review-1',
      reason: 'Inappropriate content',
    });
    request.flush({ uuid: 'report-1' });
    expect(fixture.componentInstance.reportMessage).toBe('Report submitted.');

    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('currentAccount');
  });
});
