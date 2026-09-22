from dataclasses import dataclass
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


@dataclass(frozen=True, slots=True)
class User:
    id: str
    email: str
    password_hash: str
    created_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=3)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
