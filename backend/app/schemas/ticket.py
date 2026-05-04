from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class TicketSearchResult(BaseModel):
    """A single event from the Discovery API search results."""
    event_id: str
    event_name: str
    event_url: Optional[str] = None
    image_url: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    event_date: Optional[str] = None
    status: str  # onsale | offsale | cancelled | rescheduled | postponed | unknown


class TicketSearchResponse(BaseModel):
    results: List[TicketSearchResult]


class TicketWatchCreate(BaseModel):
    event_id: str
    event_name: str
    event_url: Optional[str] = None
    image_url: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    event_date: Optional[str] = None


class TicketWatchResponse(BaseModel):
    id: int
    event_id: str
    event_name: str
    event_url: Optional[str] = None
    image_url: Optional[str] = None
    venue: Optional[str] = None
    city: Optional[str] = None
    event_date: Optional[str] = None
    status: str
    last_checked: Optional[datetime] = None
    last_notified_status: Optional[str] = None
    check_count: int
    last_error: Optional[str] = None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
