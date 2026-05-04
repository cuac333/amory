from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class DeletionRequestCreate(BaseModel):
    entity_type: str  # "monthly_activity", "outing", "wishlist_item", "diary_entry", "bucket_list_item"
    entity_id: int


class DeletionRequestResponse(BaseModel):
    id: int
    couple_id: int
    requested_by: int
    requested_by_name: str
    entity_type: str
    entity_id: int
    entity_title: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[int] = None
