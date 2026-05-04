from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class WishlistItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    category: str = Field(max_length=30)  # place | restaurant | movie | gift | experience
    title: str = Field(max_length=200)
    description: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    completed: bool = Field(default=False)
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    review: Optional[str] = Field(default=None, max_length=1000)
    is_secret: bool = Field(default=False)
    visible_to: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
