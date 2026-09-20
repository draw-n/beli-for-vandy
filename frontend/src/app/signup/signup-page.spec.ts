import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignupPage } from './signup-page';

describe('SignupPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [provideRouter([])],
    }).compileComponents();
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
});
