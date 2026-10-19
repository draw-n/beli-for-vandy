from datetime import datetime
from enum import Enum
from typing import Annotated, Literal

from pydantic import BaseModel, EmailStr, Field, StringConstraints


NonEmptyString = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class UserType(str, Enum):
    FACULTY = "faculty"
    STUDENT = "student"


class UserRole(str, Enum):
    USER = "user"
    MODERATOR = "moderator"
    ADMIN = "admin"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"


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
    role: UserRole = UserRole.USER
    status: AccountStatus = AccountStatus.ACTIVE
    suspended_until: datetime | None = None
    suspension_reason: str | None = None
    appeal_notes: str | None = None
    security_version: int = 0


class UserCreate(UserBase):
    password: str = Field(min_length=3)


class UserLogin(BaseModel):
    username: NonEmptyString
    password: str = Field(min_length=1)


class PrivilegeChange(BaseModel):
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
    role: UserRole = UserRole.USER
    status: AccountStatus = AccountStatus.ACTIVE


class PublicUserResponse(BaseModel):
    uuid: str
    username: str
    first_name: str
    last_name: str
    year_graduation: int | None = None
    type: UserType | None = None


class LoginResponse(UserResponse):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
