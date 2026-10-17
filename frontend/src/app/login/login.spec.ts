import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create the login component', () => {
    expect(component).toBeTruthy();
  });

  it('should provide a link to sign up', () => {
    const signupLink = fixture.debugElement.query(By.css('a[routerLink="/register"]'));

    expect(signupLink).toBeTruthy();
    expect(signupLink.nativeElement.textContent).toContain('Sign up');
  });

  it('stores the bearer token separately while preserving currentAccount shape', () => {
    sessionStorage.clear();
    component.username = 'sara';
    component.password = 'password123';
    component.onSubmit();
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne('http://localhost:8000/accounts/login');
    const response = {
      uuid: 'user-1', username: 'sara', first_name: 'Sara', last_name: 'Test', email: 'sara@example.com',
      year_graduation: 2027, type: 'student', home_city: 'Nashville', created_at: '2026-01-01',
      access_token: 'signed-token', token_type: 'bearer', expires_at: '2026-01-02T00:00:00Z',
    };
    request.flush(response);
    expect(sessionStorage.getItem('accessToken')).toBe('signed-token');
    const currentAccount = JSON.parse(sessionStorage.getItem('currentAccount') ?? 'null');
    expect(currentAccount.uuid).toBe('user-1');
    expect(currentAccount).not.toHaveProperty('access_token');
    expect(currentAccount).not.toHaveProperty('token_type');
    expect(currentAccount).not.toHaveProperty('expires_at');
    expect(document.cookie).toContain('mockAuth=user-1');
  });

  it('should display a username input', () => {
    const usernameInput = fixture.debugElement.query(
      By.css('input[name="username"]')
    );

    expect(usernameInput).toBeTruthy();
  });

  it('should display a password input', () => {
    const passwordInput = fixture.debugElement.query(
      By.css('input[name="password"]')
    );

    expect(passwordInput).toBeTruthy();
  });

  it('should make the password input type password', () => {
    const passwordInput = fixture.debugElement.query(
      By.css('input[name="password"]')
    );

    expect(passwordInput.nativeElement.type).toBe('password');
  });

  it('should disable the login button when both fields are empty', () => {
    component.username = '';
    component.password = '';

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));

    expect(button.nativeElement.disabled).toBe(true);
  });

  it('should disable the login button when only username is entered', () => {
    component.username = 'sara';
    component.password = '';

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));

    expect(button.nativeElement.disabled).toBe(true);
  });

  it('should disable the login button when only password is entered', () => {
    component.username = '';
    component.password = 'password123';

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));

    expect(button.nativeElement.disabled).toBe(true);
  });

  it('should enable the login button when both fields are entered', () => {
    component.username = 'sara';
    component.password = 'password123';

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));

    expect(button.nativeElement.disabled).toBe(false);
  });

  it('should update username when the user types', async () => {
    const usernameInput = fixture.debugElement.query(
      By.css('input[name="username"]')
    ).nativeElement;

    usernameInput.value = 'sara';
    usernameInput.dispatchEvent(new Event('input'));

    await fixture.whenStable();

    expect(component.username).toBe('sara');
  });

  it('should update password when the user types', async () => {
    const passwordInput = fixture.debugElement.query(
      By.css('input[name="password"]')
    ).nativeElement;

    passwordInput.value = 'password123';
    passwordInput.dispatchEvent(new Event('input'));

    await fixture.whenStable();

    expect(component.password).toBe('password123');
  });

  it('should not submit when username is empty', () => {
    component.username = '';
    component.password = 'password123';

    expect(() => component.onSubmit()).not.toThrow();
  });

  it('should not submit when password is empty', () => {
    component.username = 'sara';
    component.password = '';

    expect(() => component.onSubmit()).not.toThrow();
  });

  it('should allow submission when both fields are filled in', () => {
    component.username = 'sara';
    component.password = 'password123';

    expect(() => component.onSubmit()).not.toThrow();
  });
});
