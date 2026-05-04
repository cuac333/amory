from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class SharedSong(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    artist: str = Field(max_length=200)
    song_url: Optional[str] = None
    note: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Recipe(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    ingredients: Optional[str] = None  # JSON string of list
    instructions: Optional[str] = None
    photo_url: Optional[str] = None
    rating: Optional[int] = None  # 1-5
    cooked: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TimelineEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    photo_url: Optional[str] = None
    event_date: str = Field(max_length=10)  # YYYY-MM-DD
    icon: str = Field(default="heart", max_length=30)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DreamItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: str = Field(default="general", max_length=50)  # travel, home, experiences, personal, general
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
