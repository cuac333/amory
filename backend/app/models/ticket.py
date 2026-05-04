from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class TicketWatch(SQLModel, table=True):
    """A Ticketmaster event being watched for ticket availability."""
    id: Optional[int] = Field(default=None, primary_key=True)
    couple_id: int = Field(foreign_key="couple.id", index=True)
    created_by: int = Field(foreign_key="user.id")

    # Ticketmaster identifiers
    event_id: str = Field(index=True, max_length=64)
    event_name: str = Field(max_length=300)
    event_url: Optional[str] = Field(default=None, max_length=500)
    image_url: Optional[str] = Field(default=None, max_length=500)
    venue: Optional[str] = Field(default=None, max_length=300)
    city: Optional[str] = Field(default=None, max_length=100)
    event_date: Optional[str] = Field(default=None, max_length=30)

    # Status tracking
    status: str = Field(default="unknown", max_length=30)  # onsale | offsale | available | cancelled | unknown
    last_checked: Optional[datetime] = None
    last_notified_status: Optional[str] = Field(default=None, max_length=30)
    check_count: int = Field(default=0)
    last_error: Optional[str] = Field(default=None, max_length=500)

    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
