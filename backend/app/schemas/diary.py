from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DiaryEntryCreate(BaseModel):
    content: str
    mood: Optional[str] = None
    is_shared: bool = True


class DiaryEntryUpdate(BaseModel):
    content: Optional[str] = None
    mood: Optional[str] = None
    is_shared: Optional[bool] = None


class DiaryEntryResponse(BaseModel):
    id: int
    couple_id: int
    user_id: int
    user_name: str = ""
    content: str
    mood: Optional[str]
    photo_url: Optional[str]
    is_shared: bool
    created_at: datetime
    updated_at: datetime
    comments_count: int = 0


class MoodEntry(BaseModel):
    date: str
    mood: str
    user_id: int


class DiaryCommentCreate(BaseModel):
    content: str


class DiaryCommentResponse(BaseModel):
    id: int
    diary_entry_id: int
    user_id: int
    user_name: str = ""
    content: str
    created_at: datetime
