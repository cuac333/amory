from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ChatMessageCreate(BaseModel):
    text: Optional[str] = None
    reply_to_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    couple_id: int
    sender_id: int
    sender_name: str = ""
    text: Optional[str]
    image_url: Optional[str]
    reply_to_id: Optional[int]
    reply_preview: Optional[str] = None
    reactions: dict[str, list[int]]
    pinned: bool
    created_at: datetime


class ChatReactionUpdate(BaseModel):
    emoji: str
