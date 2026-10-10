import type { Review } from './review';

export type AccountType = 'student' | 'faculty';

interface AccountBase {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  year_graduation: number | null;
  type: AccountType;
  home_city: string;
}

export interface AccountCreateRequest extends AccountBase {
  password: string;
}

export interface AccountDeleteRequest {
  email: string;
  password: string;
}

export interface AccountLoginRequest {
  username: string;
  password: string;
}

export interface Account extends AccountBase {
  uuid: string;
  created_at: string;
}

// ---- Locations ----

export interface LocationHours {
  day: string;
  openTime: string;
  closeTime: string;
}

// Shape returned by GET /locations
export interface LocationResponse {
  uuid: string;
  name: string;
  address: string;
  tags?: string[] | null;
  hours?: [string, string, string][] | null;
}

// Shape the components use
export interface LocationDetails {
  uuid: string;
  name: string;
  location: string;
  tags: string[];
  hours: LocationHours[];
  averageRating: number;
  reviewCount: number;
  friendRating: number | null;
  photos: string[];
  reviews: Review[];
  image?: string;
}
