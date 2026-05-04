from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class DiaryEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    content: str = Field(max_length=5000)
    mood: Optional[str] = Field(default=None, max_length=10)  # emoji
    photo_url: Optional[str] = None
    is_shared: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
