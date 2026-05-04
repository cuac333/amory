from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class DeletionRequest(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    requested_by: int = Field(foreign_key="user.id")
    entity_type: str = Field(max_length=50)  # "monthly_activity", "outing", "wishlist_item", "diary_entry", "bucket_list_item"
    entity_id: int
    entity_title: str = Field(max_length=300)  # For display purposes
    status: str = Field(default="pending", max_length=20)  # "pending", "approved", "rejected"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = Field(default=None, foreign_key="user.id")
