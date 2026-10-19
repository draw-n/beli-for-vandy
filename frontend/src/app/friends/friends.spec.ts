import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';

import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { provideRouter } from '@angular/router';

import { FriendsComponent } from './friends';

describe('FriendsComponent', () => {
  let component: FriendsComponent;
  let fixture: ComponentFixture<FriendsComponent>;
  let httpMock: HttpTestingController;

  const currentAccount = {
    username: 'current.user',
    first_name: 'Current',
    last_name: 'User',
    email: 'current@example.com',
    year_graduation: 2027,
    type: 'student' as const,
    home_city: 'Nashville',
    uuid: 'user-current',
    created_at: '2026-09-01T12:00:00Z',
  };

  const ava = {
    username: 'ava.martin',
    first_name: 'Ava',
    last_name: 'Martin',
    email: 'ava@example.com',
    year_graduation: 2027,
    type: 'student' as const,
    home_city: 'Nashville',
    uuid: 'user-ava',
    created_at: '2026-09-01T12:00:00Z',
  };

  const james = {
    username: 'james.wilson',
    first_name: 'James',
    last_name: 'Wilson',
    email: 'james@example.com',
    year_graduation: 2028,
    type: 'student' as const,
    home_city: 'Atlanta',
    uuid: 'user-james',
    created_at: '2026-09-01T12:00:00Z',
  };

  beforeEach(async () => {
    sessionStorage.setItem('currentAccount', JSON.stringify(currentAccount));

    await TestBed.configureTestingModule({
      imports: [FriendsComponent],

      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);

    fixture = TestBed.createComponent(FriendsComponent);

    component = fixture.componentInstance;

    // Runs ngOnInit(), which causes GET /accounts/public and GET /follows/.
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();

    sessionStorage.clear();
  });

  // ---------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------

  it('should create', () => {
    flushInitialRequests();

    expect(component).toBeTruthy();
  });

  it('should load accounts', () => {
    flushInitialRequests();

    expect(component.socialUsers.length).toBe(2);

    expect(component.socialUsers[0].account.username).toBe('ava.martin');
  });

  it('should exclude the logged-in account', () => {
    flushInitialRequests();

    const currentUserShown = component.socialUsers.some(
      (socialUser) => socialUser.account.uuid === currentAccount.uuid,
    );

    expect(currentUserShown).toBe(false);
  });

  it('should stop loading and show an error if accounts fail to load', () => {
    const accountsRequest = httpMock.expectOne('http://localhost:8000/accounts/public');

    accountsRequest.flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('Could not load accounts.');
    expect(component.socialUsers.length).toBe(0);
  });

  it('should stop loading and show an error if follows fail to load', () => {
    flushAccounts();

    const followsRequest = httpMock.expectOne('http://localhost:8000/follows/');

    followsRequest.flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.loading).toBe(false);
    expect(component.errorMessage).toBe('Could not load follows.');
    // Accounts still show, just with no follow relationships
    expect(component.socialUsers.length).toBe(2);
  });

  // ---------------------------------------------------------------
  // Rendering (this is the test that catches the "stuck on Finding people..." bug)
  // ---------------------------------------------------------------

  it('should replace the spinner with person cards after loading', () => {
    expect(component.loading).toBe(true);

    flushInitialRequests();
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('mat-spinner')).toBeNull();
    expect(element.querySelectorAll('.person-card').length).toBe(2);
  });

  // ---------------------------------------------------------------
  // Status calculation
  // ---------------------------------------------------------------

  it('should mark an outgoing follow as following', () => {
    flushAccounts();

    const followsRequest = httpMock.expectOne('http://localhost:8000/follows/');

    followsRequest.flush([
      {
        uuid: 'follow-1',
        from_user_id: currentAccount.uuid,
        to_user_id: ava.uuid,
        is_mutual: false,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(avaSocial?.status).toBe('following');
  });

  it('should mark an incoming follow as follows-you', () => {
    flushAccounts();

    const followsRequest = httpMock.expectOne('http://localhost:8000/follows/');

    followsRequest.flush([
      {
        uuid: 'follow-1',
        from_user_id: ava.uuid,
        to_user_id: currentAccount.uuid,
        is_mutual: false,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(avaSocial?.status).toBe('follows-you');
  });

  it('should mark two-way follows as mutual friends', () => {
    flushAccounts();

    const followsRequest = httpMock.expectOne('http://localhost:8000/follows/');

    followsRequest.flush([
      {
        uuid: 'follow-outgoing',
        from_user_id: currentAccount.uuid,
        to_user_id: ava.uuid,
        is_mutual: true,
        created_at: '2026-09-20T12:00:00Z',
      },
      {
        uuid: 'follow-incoming',
        from_user_id: ava.uuid,
        to_user_id: currentAccount.uuid,
        is_mutual: true,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(avaSocial?.status).toBe('mutual');

    expect(component.friendCount).toBe(1);
  });

  // ---------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------

  it('should filter by username', () => {
    flushInitialRequests();

    component.searchTerm = 'ava';

    expect(component.filteredUsers.length).toBe(1);

    expect(component.filteredUsers[0].account.username).toBe('ava.martin');
  });

  it('should filter by full name', () => {
    flushInitialRequests();

    component.searchTerm = 'james wilson';

    expect(component.filteredUsers.length).toBe(1);

    expect(component.filteredUsers[0].account.uuid).toBe(james.uuid);
  });

  it('should return no results for an unknown user', () => {
    flushInitialRequests();

    component.searchTerm = 'does-not-exist';

    expect(component.filteredUsers.length).toBe(0);
  });

  it('should show everyone again when the search is cleared', () => {
    flushInitialRequests();

    component.searchTerm = 'ava';
    expect(component.filteredUsers.length).toBe(1);

    component.searchTerm = '';
    expect(component.filteredUsers.length).toBe(2);
  });

  // ---------------------------------------------------------------
  // Follow
  // ---------------------------------------------------------------

  it('should create a follow', () => {
    flushInitialRequests();

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(avaSocial).toBeTruthy();

    component.follow(avaSocial!);

    const request = httpMock.expectOne('http://localhost:8000/follows/');

    expect(request.request.method).toBe('POST');

    expect(request.request.body.from_user_id).toBe(currentAccount.uuid);

    expect(request.request.body.to_user_id).toBe(ava.uuid);

    expect(request.request.body.is_mutual).toBe(false);

    request.flush({
      uuid: 'new-follow',
      from_user_id: currentAccount.uuid,
      to_user_id: ava.uuid,
      is_mutual: false,
      created_at: '2026-10-05T12:00:00Z',
    });

    const updatedAva = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(updatedAva?.status).toBe('following');
  });

  it('should ignore a second click while a follow is pending', () => {
    flushInitialRequests();

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    )!;

    component.follow(avaSocial);

    expect(component.isPending(avaSocial)).toBe(true);

    // Second click should NOT send another request
    component.follow(avaSocial);

    // expectOne fails if two POSTs were sent
    const request = httpMock.expectOne('http://localhost:8000/follows/');

    request.flush({
      uuid: 'new-follow',
      from_user_id: currentAccount.uuid,
      to_user_id: ava.uuid,
      is_mutual: false,
      created_at: '2026-10-05T12:00:00Z',
    });

    expect(component.isPending(avaSocial)).toBe(false);
  });

  it('should show an error and stay not-following if the follow request fails', () => {
    flushInitialRequests();

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    )!;

    component.follow(avaSocial);

    httpMock
      .expectOne('http://localhost:8000/follows/')
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage).toBe('Could not follow this person.');
    expect(component.isPending(avaSocial)).toBe(false);

    const updatedAva = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(updatedAva?.status).toBe('not-following');
  });

  it('should follow back and mark the person as mutual', () => {
    flushAccounts();

    httpMock.expectOne('http://localhost:8000/follows/').flush([
      {
        uuid: 'follow-incoming',
        from_user_id: ava.uuid,
        to_user_id: currentAccount.uuid,
        is_mutual: false,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find((u) => u.account.uuid === ava.uuid)!;
    expect(avaSocial.status).toBe('follows-you');

    component.follow(avaSocial);

    const post = httpMock.expectOne('http://localhost:8000/follows/');
    expect(post.request.method).toBe('POST');
    expect(post.request.body.is_mutual).toBe(true);
    post.flush({
      uuid: 'follow-outgoing',
      from_user_id: currentAccount.uuid,
      to_user_id: ava.uuid,
      is_mutual: true,
      created_at: '2026-10-05T12:00:00Z',
    });

    const put = httpMock.expectOne('http://localhost:8000/follows/follow-incoming');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ is_mutual: true });
    put.flush({
      uuid: 'follow-incoming',
      from_user_id: ava.uuid,
      to_user_id: currentAccount.uuid,
      is_mutual: true,
      created_at: '2026-09-20T12:00:00Z',
    });

    const updated = component.socialUsers.find((u) => u.account.uuid === ava.uuid);
    expect(updated?.status).toBe('mutual');
    expect(component.friendCount).toBe(1);
  });

  // ---------------------------------------------------------------
  // Unfollow
  // ---------------------------------------------------------------

  it('should delete an outgoing follow', () => {
    flushAccounts();

    const followsRequest = httpMock.expectOne('http://localhost:8000/follows/');

    followsRequest.flush([
      {
        uuid: 'follow-to-delete',
        from_user_id: currentAccount.uuid,
        to_user_id: ava.uuid,
        is_mutual: false,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(avaSocial?.status).toBe('following');

    component.unfollow(avaSocial!);

    const deleteRequest = httpMock.expectOne('http://localhost:8000/follows/follow-to-delete');

    expect(deleteRequest.request.method).toBe('DELETE');

    deleteRequest.flush({
      message: 'Follow deleted successfully',
    });

    const updatedAva = component.socialUsers.find(
      (socialUser) => socialUser.account.uuid === ava.uuid,
    );

    expect(updatedAva?.status).toBe('not-following');
  });

  it('should unfollow a mutual friend and leave them as follows-you', () => {
    flushAccounts();

    httpMock.expectOne('http://localhost:8000/follows/').flush([
      {
        uuid: 'follow-outgoing',
        from_user_id: currentAccount.uuid,
        to_user_id: ava.uuid,
        is_mutual: true,
        created_at: '2026-09-20T12:00:00Z',
      },
      {
        uuid: 'follow-incoming',
        from_user_id: ava.uuid,
        to_user_id: currentAccount.uuid,
        is_mutual: true,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find((u) => u.account.uuid === ava.uuid)!;
    expect(avaSocial.status).toBe('mutual');

    component.unfollow(avaSocial);

    const del = httpMock.expectOne('http://localhost:8000/follows/follow-outgoing');
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'Follow deleted successfully' });

    const put = httpMock.expectOne('http://localhost:8000/follows/follow-incoming');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ is_mutual: false });
    put.flush({
      uuid: 'follow-incoming',
      from_user_id: ava.uuid,
      to_user_id: currentAccount.uuid,
      is_mutual: false,
      created_at: '2026-09-20T12:00:00Z',
    });

    const updated = component.socialUsers.find((u) => u.account.uuid === ava.uuid);
    expect(updated?.status).toBe('follows-you');
    expect(component.friendCount).toBe(0);
  });

  it('should show an error and keep the follow if unfollow fails', () => {
    flushAccounts();

    httpMock.expectOne('http://localhost:8000/follows/').flush([
      {
        uuid: 'follow-1',
        from_user_id: currentAccount.uuid,
        to_user_id: ava.uuid,
        is_mutual: false,
        created_at: '2026-09-20T12:00:00Z',
      },
    ]);

    const avaSocial = component.socialUsers.find((u) => u.account.uuid === ava.uuid)!;

    component.unfollow(avaSocial);

    httpMock
      .expectOne('http://localhost:8000/follows/follow-1')
      .flush('error', { status: 500, statusText: 'Server Error' });

    expect(component.errorMessage).toBe('Could not unfollow this person.');

    const updated = component.socialUsers.find((u) => u.account.uuid === ava.uuid);
    expect(updated?.status).toBe('following');
  });

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------

  it('should build initials from first and last name', () => {
    flushInitialRequests();

    const avaSocial = component.socialUsers.find((u) => u.account.uuid === ava.uuid)!;

    expect(component.getInitials(avaSocial)).toBe('AM');
  });

  function flushAccounts(): void {
    const accountsRequest = httpMock.expectOne('http://localhost:8000/accounts/public');

    expect(accountsRequest.request.method).toBe('GET');

    accountsRequest.flush([currentAccount, ava, james]);
  }

  function flushInitialRequests(): void {
    flushAccounts();

    const followsRequest = httpMock.expectOne('http://localhost:8000/follows/');

    expect(followsRequest.request.method).toBe('GET');

    followsRequest.flush([]);
  }
});
