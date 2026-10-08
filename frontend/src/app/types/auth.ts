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

interface User {
  uuid: string;
  name: string;
  location: string;
  tags: string[];
  hours: LocationHours[];
  averageRating: number;
  reviewCount: number;
  image?: string;
}