from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from models.dish_name import capitalize_initial


class ContentVisibility(str, Enum):
    PUBLIC = "public"
    HIDDEN = "hidden"
    REMOVED = "removed"


class ModerationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    FLAGGED = "flagged"
    REJECTED = "rejected"


class ReviewBase(BaseModel):
    user_id: str
    location_id: str
    rating: int
    note: Optional[str] = None
    meal_type: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    photo_ids: Optional[list[str]] = None
    favorite_dishes: list[str] = Field(default_factory=list)

    @field_validator("favorite_dishes")
    @classmethod
    def capitalize_favorite_dish_initials(cls, dishes: list[str]) -> list[str]:
        return [capitalize_initial(dish.strip()) for dish in dishes]
    visibility: ContentVisibility = ContentVisibility.PUBLIC
    moderation_status: ModerationStatus = ModerationStatus.APPROVED


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    location_id: Optional[str] = None
    rating: Optional[int] = None
    note: Optional[str] = None
    meal_type: Optional[str] = None
    updated_at: Optional[datetime] = None
    photo_ids: Optional[list[str]] = None
    favorite_dishes: list[str] = Field(default_factory=list)

    @field_validator("favorite_dishes")
    @classmethod
    def capitalize_favorite_dish_initials(cls, dishes: list[str]) -> list[str]:
        return [capitalize_initial(dish.strip()) for dish in dishes]


class ReviewResponse(ReviewBase):
    uuid: str
