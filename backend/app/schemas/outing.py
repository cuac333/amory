from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class OutingCreate(BaseModel):
    title: str
    description: Optional[str] = None
    place: Optional[str] = None
    place_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: str = "romantic"
    proposed_date: Optional[datetime] = None


class OutingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    place: Optional[str] = None
    place_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    proposed_date: Optional[datetime] = None


class OutingResponse(BaseModel):
    id: int
    couple_id: int
    proposed_by: int
    proposed_by_name: str = ""
    title: str
    description: Optional[str]
    place: Optional[str]
    place_url: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    category: str
    proposed_date: Optional[datetime]
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    voted_by: Optional[str] = None
    complete_confirmed_by: Optional[str] = None
    documented_by: Optional[str] = None


class OutingVoteCreate(BaseModel):
    approved: bool
    suggestion: Optional[str] = None


class OutingDocumentCreate(BaseModel):
    description: str


class BucketListItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None


class BucketListItemResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    description: Optional[str]
    category: Optional[str]
    completed: bool
    completed_at: Optional[datetime]
    confirmed_by: Optional[str]
    created_at: datetime
