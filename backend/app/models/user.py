from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Relationship


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(unique=True, index=True, max_length=255)
    password_hash: str
    avatar_url: Optional[str] = None
    role: Optional[str] = Field(default=None, max_length=20)  # partner_1 | partner_2
    couple_id: Optional[int] = Field(default=None, foreign_key="couple.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Couple(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    anniversary_date: datetime
    password_code: str = Field(max_length=100)
    invite_code: str = Field(unique=True, max_length=50)
    photo_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
