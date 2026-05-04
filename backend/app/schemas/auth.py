from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    couple_id: Optional[int] = None
    created_at: datetime


class CoupleCreate(BaseModel):
    anniversary_date: datetime
    password_code: str


class PasswordReset(BaseModel):
    email: str
    couple_code: str
    new_password: str


class CoupleJoin(BaseModel):
    invite_code: str


class CoupleResponse(BaseModel):
    id: int
    anniversary_date: datetime
    invite_code: str
    photo_url: Optional[str] = None
    created_at: datetime
