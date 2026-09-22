import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiningHallDetail } from './dining-hall-detail';

describe('DiningHallDetail', () => {
  let component: DiningHallDetail;
  let fixture: ComponentFixture<DiningHallDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiningHallDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(DiningHallDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
