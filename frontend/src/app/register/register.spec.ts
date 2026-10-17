import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Register } from './register';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('creates an account and clears the form', () => {
    component.createRequest = {
      username: 'commodore',
      first_name: 'Cornelius',
      last_name: 'Vanderbilt',
      email: 'person@example.com',
      password: 'password',
      year_graduation: 2027,
      type: 'student',
      home_city: 'Nashville',
    };

    component.createAccount();

    const request = http.expectOne('http://localhost:8000/accounts');
    expect(request.request.method).toBe('POST');
    request.flush({ ...component.createRequest, uuid: 'user-1', created_at: '2026-10-10' });
    expect(component.createMessage).toBe('Account created for commodore.');
    expect(component.creating).toBe(false);
    expect(component.createRequest.username).toBe('');
  });

  it('shows an API error when account creation fails', () => {
    component.createAccount();

    http.expectOne('http://localhost:8000/accounts').flush(
      { detail: 'Username already exists' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(component.createMessage).toBe('Username already exists');
    expect(component.creating).toBe(false);
  });

  it('deletes an account and clears its credentials', () => {
    component.deleteRequest = { email: 'person@example.com', password: 'password' };

    component.deleteAccount();

    const request = http.expectOne('http://localhost:8000/accounts');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toEqual({ email: 'person@example.com', password: 'password' });
    request.flush(null);
    expect(component.deleteMessage).toBe('Account deleted.');
    expect(component.deleting).toBe(false);
    expect(component.deleteRequest).toEqual({ email: '', password: '' });
  });
});
