from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AccountCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=3)


class AccountLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class AccountResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
