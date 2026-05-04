from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Achievement(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    key: str = Field(max_length=50)
    title: str = Field(max_length=200)
    description: str = Field(max_length=500)
    icon: str = Field(default="trophy", max_length=30)
    unlocked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WeeklyChallenge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    title: str = Field(max_length=200)
    description: Optional[str] = None
    week_start: str = Field(max_length=10)
    status: str = Field(default="active", max_length=20)  # active, completed, skipped
    completed_by: Optional[int] = Field(default=None, foreign_key="user.id")
    completed_at: Optional[datetime] = None
    is_preset: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DateExpense(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    amount: float
    category: str = Field(default="other", max_length=50)  # food, entertainment, travel, gifts, other
    expense_date: str = Field(max_length=10)
    note: Optional[str] = Field(default=None, max_length=300)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BudgetConfig(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    default_budget: float = Field(default=0.0)  # fallback when no per-month budget
    custom_categories: str = Field(default="")  # comma-separated custom category keys
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MonthlyBudget(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    month: str = Field(max_length=7)  # "2026-03"
    amount: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SharedCalendarEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    added_by: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    event_date: str = Field(max_length=10)
    event_time: Optional[str] = Field(default=None, max_length=5)  # HH:MM
    category: str = Field(default="general", max_length=50)  # anniversary, birthday, date, trip, general
    icon: str = Field(default="calendar", max_length=30)
    recurring: Optional[str] = Field(default=None, max_length=20)  # yearly, monthly, weekly, null
    created_at: datetime = Field(default_factory=datetime.utcnow)
