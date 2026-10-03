
interface LocationHours {
  day: string;
  openTime: string;
  closeTime: string;
}

interface LocationDetails {
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

interface LocationResponse {
  uuid: string;
  name: string;
  address: string;
  tags?: string[];
  hours?: [string, string, string, string][];
}
