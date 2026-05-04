from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class MonthlyActivity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    month: int = Field(ge=1, le=12)
    year: int
    title: str = Field(max_length=200)
    description: Optional[str] = None
    category: str = Field(default="romantic", max_length=30)  # romantic | adventure | relax | cultural | food
    status: str = Field(default="pending", max_length=20)  # pending | in_progress | waiting_partner | completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class MonthlyEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    activity_id: int = Field(foreign_key="monthlyactivity.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    photo_url: str
    feeling_text: str = Field(min_length=50, max_length=2000)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Streak(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", unique=True)
    current_streak: int = Field(default=0)
    best_streak: int = Field(default=0)
    last_completed_month: Optional[int] = None
    last_completed_year: Optional[int] = None
