from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class CustomSticker(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    uploaded_by: int = Field(foreign_key="user.id")
    name: str = Field(default="")
    image_url: str
    pack_name: str = Field(default="custom")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessage(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    sender_id: int = Field(foreign_key="user.id")
    text: Optional[str] = None
    image_url: Optional[str] = None
    reply_to_id: Optional[int] = Field(default=None, foreign_key="chatmessage.id")
    reactions: str = Field(default="")  # JSON string: {"❤️": [1,2], "😂": [1]}
    pinned: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
