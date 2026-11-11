from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class PersonalRankingUpsert(BaseModel):
    rating: float = Field(ge=1, le=10)

    @field_validator('rating')
    @classmethod
    def round_to_one_decimal(cls, v: float) -> float:
        return round(v, 1)


class PersonalRankingResponse(BaseModel):
    uuid: str
    location_id: str
    rating: float
    created_at: datetime
    updated_at: datetime


class RankedEntry(BaseModel):
    rank: int
    location_id: str
    location_name: str
    rating: float
    uuid: str


class UnratedEntry(BaseModel):
    location_id: str
    location_name: str


class RankingsResponse(BaseModel):
    rated: list[RankedEntry]
    unrated: list[UnratedEntry]
