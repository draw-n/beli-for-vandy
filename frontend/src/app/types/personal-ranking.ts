export interface RankedEntry {
  rank: number;
  location_id: string;
  location_name: string;
  rating: number;
  uuid: string;
}

export interface UnratedEntry {
  location_id: string;
  location_name: string;
}

export interface RankingsResponse {
  rated: RankedEntry[];
  unrated: UnratedEntry[];
}

export interface PersonalRankingResponse {
  uuid: string;
  location_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}
