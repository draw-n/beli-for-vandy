interface Review {
  uuid: string;
  userId: string;
  locationId: string;
  rating: number;
  reviewText: string;
  mealType: string;
  createdAt: Date;
  updatedAt: Date;
  photoIds?: string[];
}

interface ReviewResponse {
  uuid: string;
  user_id: string;
  location_id: string;
  rating: number;
  note?: string | null;
  meal_type?: string | null;
  created_at: string;
  updated_at: string;
  photo_ids?: string[] | null;
}