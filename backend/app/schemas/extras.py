from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class QuizQuestionCreate(BaseModel):
    question: str
    category: str = "custom"
    options: Optional[list[str]] = None
    correct_answer: Optional[str] = None
    difficulty: str = "medium"


class QuizQuestionResponse(BaseModel):
    id: int
    question: str
    category: str
    options: Optional[list[str]] = None
    correct_answer: Optional[str] = None
    difficulty: str
    is_preset: bool
    created_by: int
    answers: list["QuizAnswerResponse"] = []
    created_at: datetime


class QuizAnswerCreate(BaseModel):
    answer: str


class QuizAnswerResponse(BaseModel):
    id: int
    user_id: int
    user_name: str = ""
    answer: str
    created_at: datetime


class MemoryPinCreate(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    visited_at: Optional[datetime] = None


class MemoryPinResponse(BaseModel):
    id: int
    couple_id: int
    created_by: Optional[int] = None
    title: str
    description: Optional[str]
    photo_url: Optional[str]
    latitude: float
    longitude: float
    visited_at: Optional[datetime]
    created_at: datetime


class VisitCounterResponse(BaseModel):
    count: int
    last_visited: Optional[datetime]


class ScratchCardCreate(BaseModel):
    title: str
    hidden_message: str
    color: str = "burnt"


class ScratchCardResponse(BaseModel):
    id: int
    couple_id: int
    created_by: Optional[int] = None
    for_user_id: Optional[int] = None
    title: str
    hidden_message: Optional[str] = None  # Only shown if scratched
    color: str
    scratched_by: Optional[int]
    scratched_at: Optional[datetime]
    created_at: datetime


class VoucherCreate(BaseModel):
    title: str
    description: Optional[str] = None
    icon: str = "ticket"


class VoucherResponse(BaseModel):
    id: int
    couple_id: int
    created_by: Optional[int] = None
    for_user_id: Optional[int] = None
    title: str
    description: Optional[str]
    icon: str
    redeemed_by: Optional[int]
    redeemed_at: Optional[datetime]
    created_at: datetime


class TruthOrDareCreate(BaseModel):
    text: str
    card_type: str  # "truth" or "dare"
    category: str = "normal"  # "normal", "couples", "hot"


class TruthOrDareResponse(BaseModel):
    id: int
    couple_id: int
    text: str
    card_type: str
    category: str
    is_preset: bool
    created_by: int
    created_at: datetime


class SpinnerOptionCreate(BaseModel):
    text: str


class SpinnerOptionResponse(BaseModel):
    id: int
    couple_id: int
    text: str
    created_at: datetime


class SecretLetterGameCreate(BaseModel):
    content: str
    opens_at: datetime


class SecretLetterGameResponse(BaseModel):
    id: int
    couple_id: int
    author_id: int
    content: Optional[str] = None  # Hidden if not opened and not author
    opens_at: datetime
    opened_by: Optional[int]
    opened_at: Optional[datetime]
    created_at: datetime


class LoveReasonCreate(BaseModel):
    text: str
    category: str = "love"


class LoveReasonResponse(BaseModel):
    id: int
    couple_id: int
    author_id: int
    text: str
    category: str
    is_preset: bool
    created_at: datetime


class EventCountdownCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: datetime
    icon: str = "calendar"


class EventCountdownResponse(BaseModel):
    id: int
    couple_id: int
    title: str
    description: Optional[str]
    event_date: datetime
    icon: str
    created_at: datetime


class BingoCellCreate(BaseModel):
    text: str
    order: int = 0


class BingoCellResponse(BaseModel):
    id: int
    couple_id: int
    text: str
    completed: bool
    completed_at: Optional[datetime]
    order: int
    created_at: datetime


class WhosMostLikelyVoteResponse(BaseModel):
    id: int
    question_id: int
    user_id: int
    voted_for: int
    created_at: datetime


class WhosMostLikelyCreate(BaseModel):
    question: str


class WhosMostLikelyResponse(BaseModel):
    id: int
    couple_id: int
    question: str
    is_preset: bool
    created_by: int
    votes: list[WhosMostLikelyVoteResponse] = []
    created_at: datetime


class OpenWhenLetterCreate(BaseModel):
    category: str
    content: str


class OpenWhenLetterResponse(BaseModel):
    id: int
    couple_id: int
    author_id: int
    category: str
    content: Optional[str] = None  # Hidden if not opened
    opened_by: Optional[int] = None
    opened_at: Optional[datetime] = None
    created_at: datetime


class TimeCapsuleCreate(BaseModel):
    title: str
    message: Optional[str] = None
    opens_at: datetime


class TimeCapsuleResponse(BaseModel):
    id: int
    couple_id: int
    author_id: int
    title: str
    message: Optional[str] = None  # Hidden if not opened yet
    photo_url: Optional[str] = None
    opens_at: datetime
    opened: bool
    opened_at: Optional[datetime] = None
    created_at: datetime


class CoupleXPResponse(BaseModel):
    total_xp: int
    level: int
    xp_for_current_level: int
    xp_for_next_level: int
    progress_percent: float


class XPLogResponse(BaseModel):
    id: int
    user_id: int
    action: str
    xp_amount: int
    created_at: datetime


class BookClueCreate(BaseModel):
    section: str
    hint_text: str
    answer_fragment: str
    order: int = 0


class BookClueUpdate(BaseModel):
    section: Optional[str] = None
    hint_text: Optional[str] = None
    answer_fragment: Optional[str] = None
    order: Optional[int] = None


class BookClueResponse(BaseModel):
    id: int
    couple_id: int
    section: str
    hint_text: str
    answer_fragment: str
    order: int
    created_at: datetime


class SongPickCreate(BaseModel):
    title: str
    artist: str
    year: Optional[int] = None
    genre: str = "pop"
    mood: str = "happy"


class SongPickResponse(BaseModel):
    id: int
    couple_id: int
    title: str
    artist: str
    year: Optional[int]
    genre: str
    mood: str
    is_preset: bool
    listened: bool
    listened_at: Optional[datetime]
    rating: Optional[int]
    added_by: Optional[int]
    created_at: datetime


class MoviePickCreate(BaseModel):
    title: str
    year: Optional[int] = None
    category: str = "drama"
    media_type: str = "movie"
    poster_emoji: str = "🎬"


class MoviePickResponse(BaseModel):
    id: int
    couple_id: int
    title: str
    year: Optional[int]
    category: str
    media_type: str
    poster_emoji: str
    is_preset: bool
    watched: bool
    watched_at: Optional[datetime]
    rating: Optional[int]
    added_by: Optional[int]
    created_at: datetime
