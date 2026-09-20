import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountPage } from './account-page';

describe('AccountPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountPage],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('offers login and account creation', () => {
    const fixture = TestBed.createComponent(AccountPage);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );

    expect(links.map((link) => link.textContent?.trim())).toEqual(['Log in', 'Create account']);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/login', '/signup']);
  });
});
