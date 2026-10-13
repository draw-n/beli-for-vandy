import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';

import { Locations } from './locations';

describe('Locations', () => {
  let component: Locations;
  let fixture: ComponentFixture<Locations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Locations],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Locations);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates to dining halls filtered by the clicked tag', () => {
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const event = new Event('click');
    const stopPropagation = vi.spyOn(event, 'stopPropagation');

    component.searchByTag(event, 'Late Night');

    expect(stopPropagation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/locations'], {
      queryParams: { search: 'Late Night' },
    });
  });
});
