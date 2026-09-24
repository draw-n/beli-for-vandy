from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class UserType(str, Enum):
    FACULTY = "faculty"
    STUDENT = "student"


@dataclass(frozen=True, slots=True)
class User:
    username: str
    first_name: str
    last_name: str
    email: str
    password_hash: str
    uuid: str
    year_graduation: int | None
    type: UserType
    created_at: datetime
    home_city: str


class UserCreate(BaseModel):
    username: NonEmptyString
    first_name: NonEmptyString
    last_name: NonEmptyString
    email: EmailStr
    password: str = Field(min_length=3)
    year_graduation: int | None = None
    type: UserType
    home_city: NonEmptyString


class UserDelete(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    username: str
    first_name: str
    last_name: str
    email: EmailStr
    uuid: str
    year_graduation: int | None
    type: UserType
    created_at: datetime
    home_city: str
