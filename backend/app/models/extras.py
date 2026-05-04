from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class VisitCounter(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", unique=True)
    count: int = Field(default=0)
    last_visited: Optional[datetime] = None


class QuizQuestion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    question: str = Field(max_length=500)
    category: str = Field(default="custom", max_length=50)  # love, personality, tvd, bts, top, kpop, movies, custom
    options: Optional[str] = None  # JSON array of options for multiple choice, null = open answer
    correct_answer: Optional[str] = None  # For trivia questions
    difficulty: str = Field(default="medium", max_length=20)  # easy, medium, hard
    is_preset: bool = Field(default=False)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class QuizAnswer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="quizquestion.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    answer: str = Field(max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BookClue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    section: str = Field(max_length=50)  # diary, outings, wishlist, monthly, settings
    hint_text: str = Field(max_length=300)  # The clue/question shown to the user
    answer_fragment: str = Field(max_length=100)  # The piece of the final password
    order: int = Field(default=0)  # Order in the final password concatenation
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ScratchCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    for_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    title: str = Field(max_length=200)
    hidden_message: str = Field(max_length=500)
    color: str = Field(default="burnt", max_length=30)
    scratched_by: Optional[int] = Field(default=None, foreign_key="user.id")
    scratched_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Voucher(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    for_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    title: str = Field(max_length=200)
    description: Optional[str] = None
    icon: str = Field(default="ticket", max_length=30)
    redeemed_by: Optional[int] = Field(default=None, foreign_key="user.id")
    redeemed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TruthOrDare(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    text: str = Field(max_length=500)
    card_type: str = Field(max_length=10)  # "truth" or "dare"
    category: str = Field(default="normal", max_length=20)  # "normal", "couples", "hot"
    is_preset: bool = Field(default=False)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SpinnerOption(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    text: str = Field(max_length=200)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SecretLetterGame(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    author_id: int = Field(foreign_key="user.id")
    content: str = Field(max_length=2000)
    opens_at: datetime
    opened_by: Optional[int] = Field(default=None, foreign_key="user.id")
    opened_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class LoveReason(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    author_id: int = Field(foreign_key="user.id")
    text: str = Field(max_length=500)
    category: str = Field(default="love", max_length=50)
    is_preset: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EventCountdown(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    title: str = Field(max_length=200)
    description: Optional[str] = None
    event_date: datetime
    icon: str = Field(default="calendar", max_length=30)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class BingoCell(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    text: str = Field(max_length=200)
    completed: bool = Field(default=False)
    completed_at: Optional[datetime] = None
    order: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WhosMostLikely(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    question: str = Field(max_length=500)
    is_preset: bool = Field(default=False)
    created_by: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WhosMostLikelyVote(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    question_id: int = Field(foreign_key="whosmostlikely.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    voted_for: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TimeCapsule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    author_id: int = Field(foreign_key="user.id")
    title: str = Field(max_length=200)
    message: Optional[str] = None
    photo_url: Optional[str] = None
    opens_at: datetime
    opened: bool = Field(default=False)
    opened_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CoupleXP(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", unique=True)
    total_xp: int = Field(default=0)
    level: int = Field(default=1)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class XPLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    user_id: int = Field(foreign_key="user.id")
    action: str = Field(max_length=100)
    xp_amount: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OpenWhenLetter(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    author_id: int = Field(foreign_key="user.id")
    category: str = Field(max_length=50)  # happy, sad, stressed, angry, missing, grateful, bored, scared, lonely, proud
    content: str = Field(max_length=2000)
    opened_by: Optional[int] = Field(default=None, foreign_key="user.id")
    opened_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MoviePick(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    title: str = Field(max_length=200)
    year: Optional[int] = None
    category: str = Field(default="drama", max_length=50)
    media_type: str = Field(default="movie", max_length=20)  # "movie" or "series"
    poster_emoji: str = Field(default="🎬", max_length=10)
    is_preset: bool = Field(default=False)
    watched: bool = Field(default=False)
    watched_at: Optional[datetime] = None
    rating: Optional[int] = None  # 1-5
    added_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SongPick(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    title: str = Field(max_length=200)
    artist: str = Field(max_length=200)
    year: Optional[int] = None
    genre: str = Field(default="pop", max_length=50)
    mood: str = Field(default="happy", max_length=50)
    is_preset: bool = Field(default=False)
    listened: bool = Field(default=False)
    listened_at: Optional[datetime] = None
    rating: Optional[int] = None  # 1-5
    added_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MemoryPin(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: Optional[int] = None
    title: str = Field(max_length=200)
    description: Optional[str] = None
    photo_url: Optional[str] = None
    latitude: float
    longitude: float
    visited_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
