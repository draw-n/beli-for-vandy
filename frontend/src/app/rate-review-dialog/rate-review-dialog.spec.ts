import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RateReviewDialog } from './rate-review-dialog';

describe('RateReviewDialog', () => {
  let component: RateReviewDialog;
  let fixture: ComponentFixture<RateReviewDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RateReviewDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(RateReviewDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
