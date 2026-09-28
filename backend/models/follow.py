from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class FollowBase(BaseModel):
    from_user_id: str
    to_user_id: str
    is_mutual: bool
    created_at: datetime

class FollowCreate(FollowBase):
    pass

class FollowUpdate(BaseModel):
    from_user_id: Optional[str] = None
    to_user_id: Optional[str] = None
    is_mutual: Optional[bool] = None

class FollowResponse(FollowBase):
    uuid: str
