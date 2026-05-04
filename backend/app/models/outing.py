from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Outing(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    proposed_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    place: Optional[str] = Field(default=None, max_length=300)
    place_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: str = Field(default="romantic", max_length=30)  # romantic | adventure | relax | cultural | food
    proposed_date: Optional[datetime] = None
    status: str = Field(default="proposed", max_length=20)  # proposed | approved | completed | documented
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    complete_confirmed_by: Optional[str] = Field(default=None, max_length=100)


class OutingVote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    outing_id: int = Field(foreign_key="outing.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    approved: bool
    suggestion: Optional[str] = Field(default=None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OutingDocument(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    outing_id: int = Field(foreign_key="outing.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    photo_url: str
    description: str = Field(max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BucketListItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    category: Optional[str] = Field(default=None, max_length=30)
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    confirmed_by: Optional[str] = Field(default=None, max_length=100)
    created_at: datetime = Field(default_factory=datetime.utcnow)
