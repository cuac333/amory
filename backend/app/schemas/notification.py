from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict  # {"p256dh": "...", "auth": "..."}


class PushSubscriptionResponse(BaseModel):
    id: int
    user_id: int
    endpoint: str
    created_at: datetime


class SendNotificationRequest(BaseModel):
    title: str
    body: str
    url: Optional[str] = "/"
