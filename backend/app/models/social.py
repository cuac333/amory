from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class DailyQuestion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    question_text: str = Field(max_length=500)
    is_preset: bool = Field(default=False)
    date: str = Field(max_length=10)  # YYYY-MM-DD
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DailyAnswer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="dailyquestion.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    answer_text: str = Field(max_length=1000)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ThinkingOfYou(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    sender_id: int = Field(foreign_key="user.id")
    message: Optional[str] = Field(default=None, max_length=200)
    seen: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
