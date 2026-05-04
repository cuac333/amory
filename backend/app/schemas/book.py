from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class BookPageCreate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    page_type: str = "inner"
    order: int = 0
    particle_type: Optional[str] = None
    created_at: Optional[datetime] = None


class BookPageUpdate(BaseModel):
    title: Optional[str] = None
    text: Optional[str] = None
    page_type: Optional[str] = None
    order: Optional[int] = None
    particle_type: Optional[str] = None


class BookPageResponse(BaseModel):
    id: int
    couple_id: int
    title: Optional[str]
    photo_url: Optional[str]
    text: Optional[str]
    audio_url: Optional[str]
    page_type: str
    order: int
    particle_type: Optional[str]
    created_at: datetime
    likes_count: int = 0
    comments_count: int = 0


class ReorderRequest(BaseModel):
    page_ids: list[int]


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    page_id: int
    user_id: int
    user_name: str = ""
    content: str
    created_at: datetime


class ReactionCreate(BaseModel):
    emoji: str


class ReactionResponse(BaseModel):
    emoji: str
    count: int


class StickerCreate(BaseModel):
    emoji: str
    position_x: float
    position_y: float
    scale: float = 1.0
    rotation: float = 0.0


class StickerResponse(BaseModel):
    id: int
    emoji: str
    position_x: float
    position_y: float
    scale: float
    rotation: float


class SecretLetterCreate(BaseModel):
    content: str
    unlock_code: str


class SecretLetterUnlock(BaseModel):
    code: str


class SecretLetterResponse(BaseModel):
    id: int
    content: Optional[str] = None
    is_unlocked: bool
    created_at: datetime


class GuestBookEntryCreate(BaseModel):
    author_name: str
    message: str
    guest_password: str


class GuestBookEntryResponse(BaseModel):
    id: int
    author_name: str
    message: str
    created_at: datetime
