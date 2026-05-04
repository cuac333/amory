from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class PushSubscription(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    endpoint: str
    p256dh: str
    auth: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
