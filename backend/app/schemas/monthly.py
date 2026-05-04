from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MonthlyActivityCreate(BaseModel):
    month: int
    year: int
    title: str
    description: Optional[str] = None
    category: str = "romantic"


class MonthlyActivityResponse(BaseModel):
    id: int
    couple_id: int
    month: int
    year: int
    title: str
    description: Optional[str]
    category: str
    status: str
    created_at: datetime
    completed_at: Optional[datetime]
    entries: list["MonthlyEntryResponse"] = []


class MonthlyEntryCreate(BaseModel):
    feeling_text: str


class MonthlyEntryResponse(BaseModel):
    id: int
    activity_id: int
    user_id: int
    user_name: str = ""
    photo_url: str
    feeling_text: str
    created_at: datetime


class StreakResponse(BaseModel):
    current_streak: int
    best_streak: int
    last_completed_month: Optional[int]
    last_completed_year: Optional[int]
