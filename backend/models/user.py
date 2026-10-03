from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class UserType(str, Enum):
    FACULTY = "faculty"
    STUDENT = "student"


class UserBase(BaseModel):
    username: NonEmptyString
    first_name: NonEmptyString
    last_name: NonEmptyString
    email: EmailStr
    year_graduation: int | None = None
    type: UserType
    home_city: NonEmptyString


class StoredUser(UserBase):
    password_hash: str
    uuid: str
    created_at: datetime


class UserCreate(UserBase):
    password: str = Field(min_length=3)


class UserLogin(BaseModel):
    username: NonEmptyString
    password: str = Field(min_length=1)


class UserUpdate(BaseModel):
    username: NonEmptyString | None = None
    first_name: NonEmptyString | None = None
    last_name: NonEmptyString | None = None
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=3)
    year_graduation: int | None = None
    type: UserType | None = None
    home_city: NonEmptyString | None = None


class UserResponse(UserBase):
    uuid: str
    created_at: datetime
