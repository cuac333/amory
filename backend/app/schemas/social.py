from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DailyQuestionCreate(BaseModel):
    question_text: str


class DailyAnswerCreate(BaseModel):
    answer_text: str


class DailyAnswerResponse(BaseModel):
    id: int
    question_id: int
    user_id: int
    user_name: str = ""
    answer_text: str
    created_at: datetime


class DailyQuestionResponse(BaseModel):
    id: int
    couple_id: int
    question_text: str
    is_preset: bool
    date: str
    answers: list[DailyAnswerResponse] = []
    created_at: datetime


class ThinkingOfYouCreate(BaseModel):
    message: Optional[str] = None


class ThinkingOfYouResponse(BaseModel):
    id: int
    couple_id: int
    sender_id: int
    sender_name: str = ""
    message: Optional[str]
    seen: bool
    created_at: datetime
