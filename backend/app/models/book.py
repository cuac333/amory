from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class BookPage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    title: Optional[str] = Field(default=None, max_length=200)
    photo_url: Optional[str] = None
    text: Optional[str] = None
    audio_url: Optional[str] = None
    page_type: str = Field(default="inner", max_length=20)  # cover | inner | back_cover
    order: int = Field(default=0)
    particle_type: Optional[str] = Field(default=None, max_length=30)  # hearts | petals | stars | snow
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Like(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    page_id: int = Field(foreign_key="bookpage.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Comment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    page_id: int = Field(foreign_key="bookpage.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    content: str = Field(min_length=1, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Reaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    page_id: int = Field(foreign_key="bookpage.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    emoji: str = Field(max_length=10)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Sticker(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    page_id: int = Field(foreign_key="bookpage.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    emoji: str = Field(max_length=10)
    position_x: float = Field(default=0.0)
    position_y: float = Field(default=0.0)
    scale: float = Field(default=1.0)
    rotation: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SecretLetter(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    content: str
    unlock_code: str = Field(max_length=100)
    is_unlocked: bool = Field(default=False)
    unlocked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PagePhoto(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_by: Optional[int] = None
    page_id: int = Field(foreign_key="bookpage.id", index=True)
    frame_index: int = Field(default=0)
    photo_url: str
    caption: Optional[str] = Field(default=None, max_length=500)
    taken_date: Optional[str] = Field(default=None, max_length=30)
    place_name: Optional[str] = Field(default=None, max_length=200)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GuestBookEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    author_name: str = Field(max_length=100)
    message: str = Field(max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow)
