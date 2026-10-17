from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LocationBase(BaseModel):
    name: str
    address: str
    tags: Optional[list[str]] = None
    hours: Optional[list[tuple[str, str, str, str]]] = None # Day of week, opening time, closing time, meal_type
    created_at: datetime
    updated_at: datetime

class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    tags: Optional[list[str]] = None
    hours: Optional[list[tuple[str, str, str, str]]] = None # Day of week, opening time, closing time, meal_type
    updated_at: Optional[datetime] = None


class LocationResponse(LocationBase):
    uuid: str
