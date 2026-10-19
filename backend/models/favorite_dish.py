from datetime import datetime

from pydantic import BaseModel, Field


class FavoriteDishCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    location_id: str = Field(min_length=1)
    location_name: str = Field(min_length=1, max_length=160)


class FavoriteDishResponse(BaseModel):
    uuid: str
    name: str
    location_id: str | None = None
    location_name: str | None = None
    created_at: datetime
