import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiningHalls } from './dining-halls';

describe('DiningHalls', () => {
  let component: DiningHalls;
  let fixture: ComponentFixture<DiningHalls>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiningHalls],
    }).compileComponents();

    fixture = TestBed.createComponent(DiningHalls);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
