import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocationProfile } from './location-profile';

describe('LocationProfile', () => {
  let component: LocationProfile;
  let fixture: ComponentFixture<LocationProfile>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocationProfile],
    }).compileComponents();

    fixture = TestBed.createComponent(LocationProfile);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
