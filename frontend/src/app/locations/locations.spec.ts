import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { Locations } from './locations';

describe('Locations', () => {
  let component: Locations;
  let fixture: ComponentFixture<Locations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Locations],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Locations);
    component = fixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('http://localhost:8000/locations/').flush([]);
    http.expectOne('http://localhost:8000/reviews/').flush([]);
    http.verify();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
