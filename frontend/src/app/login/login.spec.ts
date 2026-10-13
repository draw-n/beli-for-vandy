import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
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