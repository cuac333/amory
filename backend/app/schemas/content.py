from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# --- Shared Songs ---

class SharedSongCreate(BaseModel):
    title: str
    artist: str
    song_url: Optional[str] = None
    note: Optional[str] = None


class SharedSongResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    artist: str
    song_url: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Recipes ---

class RecipeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    ingredients: Optional[list[str]] = None
    instructions: Optional[str] = None
    rating: Optional[int] = None


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    ingredients: Optional[list[str]] = None
    instructions: Optional[str] = None
    rating: Optional[int] = None
    cooked: Optional[bool] = None


class RecipeResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    description: Optional[str] = None
    ingredients: Optional[list[str]] = None
    instructions: Optional[str] = None
    photo_url: Optional[str] = None
    rating: Optional[int] = None
    cooked: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Timeline Events ---

class TimelineEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    icon: str = "heart"


class TimelineEventResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    description: Optional[str] = None
    photo_url: Optional[str] = None
    event_date: str
    icon: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Dream Board ---

class DreamItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "general"


class DreamItemResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    category: str
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
