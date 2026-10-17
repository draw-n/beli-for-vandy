export interface FollowResponse {
  uuid: string;
  from_user_id: string;
  to_user_id: string;
  is_mutual: boolean;
  created_at: string;
}

export interface FollowCreateRequest {
  from_user_id: string;
  to_user_id: string;
  is_mutual: boolean;
  created_at: string;
}

export interface FollowUpdateRequest {
  from_user_id?: string;
  to_user_id?: string;
  is_mutual?: boolean;
}
