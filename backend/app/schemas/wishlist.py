from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WishlistItemCreate(BaseModel):
    category: str
    title: str
    description: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None
    is_secret: bool = False


class WishlistItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    image_url: Optional[str] = None


class WishlistItemComplete(BaseModel):
    rating: int
    review: Optional[str] = None


class WishlistItemResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    category: str
    title: str
    description: Optional[str]
    url: Optional[str]
    image_url: Optional[str]
    completed: bool
    rating: Optional[int]
    review: Optional[str]
    is_secret: bool
    created_at: datetime
    completed_at: Optional[datetime]
