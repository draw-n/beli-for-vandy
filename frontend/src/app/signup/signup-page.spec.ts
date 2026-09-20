import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignupPage } from './signup-page';

describe('SignupPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('rejects passwords that do not match', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const values = [
      'person@example.com',
      'a sufficiently long password',
      'a different long password',
    ];

    inputs.forEach((input, index) => {
      input.value = values[index];
      input.dispatchEvent(new Event('input'));
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Passwords must match.');
  });

  it('requires at least three password characters', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    const values = ['person@example.com', 'ab', 'ab'];

    inputs.forEach((input, index) => {
      input.value = values[index];
      input.dispatchEvent(new Event('input'));
    });

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Use a password with at least 3 characters.',
    );
  });

  it('creates an account through the API', () => {
    const fixture = TestBed.createComponent(SignupPage);
    fixture.detectChanges();

    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
    ['person@example.com', 'abc', 'abc'].forEach((value, index) => {
      inputs[index].value = value;
      inputs[index].dispatchEvent(new Event('input'));
    });

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    const request = TestBed.inject(HttpTestingController).expectOne('/api/auth/signup');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'person@example.com', password: 'abc' });
    request.flush({
      id: 'account-id',
      email: 'person@example.com',
      created_at: '2026-09-20T00:00:00Z',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Account created. You can now log in.');
  });
});
