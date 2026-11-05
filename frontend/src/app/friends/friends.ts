import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AccountApi } from '../api/account.api';
import { FollowApi } from '../api/follow.api';

import { Account, PublicAccount } from '../types/auth';
import { FollowResponse } from '../types/follow';

type SocialStatus = 'not-following' | 'following' | 'follows-you' | 'mutual';

type FriendsView = 'discover' | 'friends';

interface SocialUser {
  account: PublicAccount;
  status: SocialStatus;

  // Logged-in user -> this user
  outgoingFollow?: FollowResponse;

  // This user -> logged-in user
  incomingFollow?: FollowResponse;
}

@Component({
  selector: 'app-friends',
  standalone: true,
  templateUrl: './friends.html',
  styleUrl: './friends.css',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
})
export class FriendsComponent implements OnInit {
  private readonly accountApi = inject(AccountApi);

  private readonly followApi = inject(FollowApi);

  private readonly router = inject(Router);

  private readonly cdr = inject(ChangeDetectorRef);

  currentAccount: Account | null = null;

  accounts: PublicAccount[] = [];

  follows: FollowResponse[] = [];

  socialUsers: SocialUser[] = [];

  searchTerm = '';

  activeView: FriendsView = 'discover';

  loading = true;

  errorMessage = '';

  pendingUserIds = new Set<string>();

  ngOnInit(): void {
    if (!this.loadCurrentAccount()) {
      this.loading = false;

      this.cdr.markForCheck();

      return;
    }

    this.loadData();
  }

  private loadCurrentAccount(): boolean {
    const storedAccount = sessionStorage.getItem('currentAccount');

    if (!storedAccount) {
      void this.router.navigate(['/login']);

      return false;
    }

    try {
      const parsed = JSON.parse(storedAccount) as Account;

      if (!parsed || !parsed.uuid) {
        throw new Error('Invalid stored account');
      }

      this.currentAccount = parsed;

      return true;
    } catch {
      sessionStorage.removeItem('currentAccount');

      void this.router.navigate(['/login']);

      return false;
    }
  }

  loadData(): void {
    if (!this.currentAccount) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.cdr.markForCheck();

    /*
     * First load all accounts.
     */
    this.accountApi.getPublic().subscribe({
      next: (accounts) => {
        this.accounts = accounts ?? [];

        /*
         * Then load all follow relationships.
         */
        this.followApi.getAll().subscribe({
          next: (follows) => {
            this.follows = follows ?? [];

            this.buildSocialUsers();

            this.loading = false;

            this.cdr.markForCheck();
          },

          error: (error) => {
            console.error('FOLLOWS ERROR:', error);

            this.follows = [];

            this.buildSocialUsers();

            this.errorMessage = 'Could not load follows.';

            this.loading = false;

            this.cdr.markForCheck();
          },
        });
      },

      error: (error) => {
        console.error('ACCOUNTS ERROR:', error);

        this.accounts = [];

        this.socialUsers = [];

        this.errorMessage = 'Could not load accounts.';

        this.loading = false;

        this.cdr.markForCheck();
      },
    });
  }

  private buildSocialUsers(): void {
    if (!this.currentAccount) {
      this.socialUsers = [];

      this.cdr.markForCheck();

      return;
    }

    const currentUserId = this.currentAccount.uuid;

    const accounts = this.accounts ?? [];

    const follows = this.follows ?? [];

    this.socialUsers = accounts

      /*
       * Don't show the logged-in user
       * in their own people list.
       */
      .filter((account) => account.uuid !== currentUserId)

      .map((account) => {
        /*
         * Does the logged-in user
         * follow this person?
         *
         * ME -> THEM
         */
        const outgoingFollow = follows.find(
          (follow) => follow.from_user_id === currentUserId && follow.to_user_id === account.uuid,
        );

        /*
         * Does this person follow
         * the logged-in user?
         *
         * THEM -> ME
         */
        const incomingFollow = follows.find(
          (follow) => follow.from_user_id === account.uuid && follow.to_user_id === currentUserId,
        );

        let status: SocialStatus = 'not-following';

        /*
         * Friends = both users follow
         * each other.
         */
        if (outgoingFollow && incomingFollow) {
          status = 'mutual';
        }

        /*
         * We follow them,
         * but they don't follow us.
         */
        else if (outgoingFollow) {
          status = 'following';
        }

        /*
         * They follow us,
         * but we don't follow them.
         */
        else if (incomingFollow) {
          status = 'follows-you';
        }

        return {
          account,
          status,
          outgoingFollow,
          incomingFollow,
        };
      });

    this.cdr.markForCheck();
  }

  /*
   * Controls both:
   *
   * - Discover vs Friends
   * - Search filtering
   */
  get filteredUsers(): SocialUser[] {
    let users = this.socialUsers ?? [];

    /*
     * Friends tab only shows
     * mutual follows.
     */
    if (this.activeView === 'friends') {
      users = users.filter((socialUser) => socialUser.status === 'mutual');
    }

    const search = (this.searchTerm ?? '').trim().toLowerCase();

    if (!search) {
      return users;
    }

    return users.filter((socialUser) => {
      const account = socialUser.account;

      const username = account.username?.toLowerCase() ?? '';

      const fullName = `${account.first_name ?? ''} ${account.last_name ?? ''}`
        .trim()
        .toLowerCase();

      return username.includes(search) || fullName.includes(search);
    });
  }

  /*
   * Number displayed in the
   * Friends counter.
   */
  get friendCount(): number {
    return (this.socialUsers ?? []).filter((socialUser) => socialUser.status === 'mutual').length;
  }

  /*
   * Switch between:
   *
   * Discover
   * Friends
   */
  setView(view: FriendsView): void {
    this.activeView = view;

    /*
     * Start each tab with a clean
     * search field.
     */
    this.searchTerm = '';

    this.cdr.markForCheck();
  }

  /*
   * Follow another user.
   */
  follow(socialUser: SocialUser): void {
    if (!this.currentAccount) {
      return;
    }

    const targetId = socialUser.account.uuid;

    /*
     * Prevent duplicate requests
     * from double-clicking.
     */
    if (this.pendingUserIds.has(targetId)) {
      return;
    }

    this.pendingUserIds.add(targetId);

    this.errorMessage = '';

    this.cdr.markForCheck();

    this.followApi
      .create({
        from_user_id: this.currentAccount.uuid,

        to_user_id: targetId,

        /*
         * If they already follow us,
         * following them back makes
         * the relationship mutual.
         */
        is_mutual: socialUser.status === 'follows-you',

        created_at: new Date().toISOString(),
      })
      .subscribe({
        next: (createdFollow) => {
          /*
           * Add our newly created
           * relationship locally.
           */
          this.follows = [...this.follows, createdFollow];

          /*
           * They already followed us.
           *
           * Update their existing
           * relationship to mutual.
           */
          if (socialUser.incomingFollow) {
            this.setIncomingMutual(socialUser.incomingFollow, true, targetId);
          }

          /*
           * They didn't follow us.
           *
           * We're simply Following.
           */
          else {
            this.pendingUserIds.delete(targetId);

            this.buildSocialUsers();
          }
        },

        error: (error) => {
          console.error('Could not follow user:', error);

          this.pendingUserIds.delete(targetId);

          this.errorMessage = 'Could not follow this person.';

          this.cdr.markForCheck();
        },
      });
  }

  /*
   * Stop following another user.
   */
  unfollow(socialUser: SocialUser): void {
    const outgoing = socialUser.outgoingFollow;

    /*
     * We can't unfollow someone
     * if there is no outgoing
     * follow relationship.
     */
    if (!outgoing) {
      return;
    }

    const targetId = socialUser.account.uuid;

    if (this.pendingUserIds.has(targetId)) {
      return;
    }

    this.pendingUserIds.add(targetId);

    this.errorMessage = '';

    this.cdr.markForCheck();

    this.followApi.delete(outgoing.uuid).subscribe({
      next: () => {
        /*
         * Remove our outgoing
         * relationship locally.
         */
        this.follows = this.follows.filter((follow) => follow.uuid !== outgoing.uuid);

        /*
         * If they still follow us,
         * their relationship is no
         * longer mutual.
         */
        if (socialUser.incomingFollow) {
          this.setIncomingMutual(socialUser.incomingFollow, false, targetId);
        }

        /*
         * Otherwise neither user
         * follows the other.
         */
        else {
          this.pendingUserIds.delete(targetId);

          this.buildSocialUsers();
        }
      },

      error: (error) => {
        console.error('Could not unfollow user:', error);

        this.pendingUserIds.delete(targetId);

        this.errorMessage = 'Could not unfollow this person.';

        this.cdr.markForCheck();
      },
    });
  }

  /*
   * Update the other user's existing
   * Follow record when a relationship
   * becomes mutual or stops being mutual.
   */
  private setIncomingMutual(
    incomingFollow: FollowResponse,
    isMutual: boolean,
    targetId: string,
  ): void {
    this.followApi
      .update(incomingFollow.uuid, {
        is_mutual: isMutual,
      })
      .subscribe({
        next: (updatedFollow) => {
          /*
           * Replace the old version
           * of the relationship with
           * the updated one.
           */
          this.follows = this.follows.map((follow) =>
            follow.uuid === updatedFollow.uuid ? updatedFollow : follow,
          );

          this.pendingUserIds.delete(targetId);

          /*
           * Recalculate all social
           * statuses.
           */
          this.buildSocialUsers();
        },

        error: (error) => {
          console.error('Could not update mutual relationship:', error);

          this.pendingUserIds.delete(targetId);

          /*
           * One database operation may
           * have succeeded while the
           * second failed, so reload
           * the true state from the API.
           */
          this.loadData();
        },
      });
  }

  /*
   * Used by the HTML to disable
   * buttons while a request is
   * in progress.
   */
  isPending(socialUser: SocialUser): boolean {
    return this.pendingUserIds.has(socialUser.account.uuid);
  }

  /*
   * Ava Martin -> AM
   */
  getInitials(socialUser: SocialUser): string {
    const first = socialUser.account.first_name?.charAt(0) ?? '';

    const last = socialUser.account.last_name?.charAt(0) ?? '';

    return `${first}${last}`.toUpperCase();
  }
}
