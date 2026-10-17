import type { Review } from './review';

export interface LocationHours {
  day: string;
  openTime: string;
  closeTime: string;
}

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

export interface LocationResponse {
  uuid: string;
  name: string;
  address: string;
  tags?: string[];
  hours?: [string, string, string, string][];
}
