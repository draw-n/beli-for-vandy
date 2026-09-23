from datetime import datetime
from pydantic import BaseModel
from typing import Optional


class ReviewBase(BaseModel):
    user_id: str
    location_id: str
    rating: int
    note: Optional[str] = None
    meal_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    photo_ids: Optional[list[str]] = None


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    location_id: Optional[str] = None
    rating: Optional[int] = None
    note: Optional[str] = None
    meal_type: Optional[str] = None
    updated_at: Optional[datetime] = None
    photo_ids: Optional[list[str]] = None


class ReviewResponse(ReviewBase):
    uuid: str
