from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AchievementResponse(BaseModel):
    id: int
    couple_id: int
    key: str
    title: str
    description: str
    icon: str
    unlocked_at: Optional[datetime] = None
    created_at: datetime


class WeeklyChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = None


class WeeklyChallengeResponse(BaseModel):
    id: int
    couple_id: int
    title: str
    description: Optional[str] = None
    week_start: str
    status: str
    completed_by: Optional[int] = None
    completed_at: Optional[datetime] = None
    is_preset: bool
    created_at: datetime


class DateExpenseCreate(BaseModel):
    title: str
    amount: float
    category: str = "other"
    expense_date: str
    note: Optional[str] = None


class DateExpenseResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    amount: float
    category: str
    expense_date: str
    note: Optional[str] = None
    created_at: datetime


class MonthBudgetEntry(BaseModel):
    month: str           # "2026-03"
    budget: float        # base budget + rollover
    rollover: float      # carried from previous month
    spent: float
    remaining: float


class BudgetSummary(BaseModel):
    total: float
    by_category: dict[str, float]
    month_total: float
    this_month: str
    default_budget: float
    effective_budget: float      # this month's budget including rollover
    remaining: float
    custom_categories: list[str]
    monthly_history: list[MonthBudgetEntry]
    per_month_budgets: dict[str, float]  # "2026-03" -> amount


class BudgetConfigUpdate(BaseModel):
    default_budget: Optional[float] = None
    custom_categories: Optional[list[str]] = None


class BudgetConfigResponse(BaseModel):
    id: int
    couple_id: int
    default_budget: float
    custom_categories: list[str]
    updated_at: datetime


class MonthlyBudgetSet(BaseModel):
    month: str     # "2026-03"
    amount: float


class SharedCalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: str
    event_time: Optional[str] = None
    category: str = "general"
    icon: str = "calendar"
    recurring: Optional[str] = None


class SharedCalendarEventResponse(BaseModel):
    id: int
    couple_id: int
    added_by: int
    title: str
    description: Optional[str] = None
    event_date: str
    event_time: Optional[str] = None
    category: str
    icon: str
    recurring: Optional[str] = None
    created_at: datetime
