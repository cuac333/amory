import json
import traceback
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pywebpush import webpush, WebPushException
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User, Couple
from app.models.notification import PushSubscription
from app.models.gamification import SharedCalendarEvent
from app.schemas.notification import PushSubscriptionCreate, PushSubscriptionResponse
from app.config import VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CLAIMS_EMAIL

router = APIRouter(prefix="/notifications", tags=["notifications"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


@router.get("/vapid-public-key")
def get_vapid_key():
    return {"public_key": VAPID_PUBLIC_KEY}


@router.post("/subscribe", response_model=PushSubscriptionResponse)
def subscribe(
    data: PushSubscriptionCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    # Remove old subscription for this endpoint
    existing = session.exec(
        select(PushSubscription).where(
            PushSubscription.user_id == user.id,
            PushSubscription.endpoint == data.endpoint,
        )
    ).first()
    if existing:
        existing.p256dh = data.keys.get("p256dh", "")
        existing.auth = data.keys.get("auth", "")
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    sub = PushSubscription(
        user_id=user.id,
        couple_id=couple_id,
        endpoint=data.endpoint,
        p256dh=data.keys.get("p256dh", ""),
        auth=data.keys.get("auth", ""),
    )
    session.add(sub)
    session.commit()
    session.refresh(sub)
    return sub


@router.delete("/unsubscribe")
def unsubscribe(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    subs = session.exec(
        select(PushSubscription).where(PushSubscription.user_id == user.id)
    ).all()
    for s in subs:
        session.delete(s)
    session.commit()
    return {"ok": True}


def send_push_to_user(user_id: int, title: str, body: str, url: str = "/", session: Session = None, tag: str = "amory"):
    """Send a push notification to all subscriptions of a user."""
    if not session:
        return
    subs = session.exec(
        select(PushSubscription).where(PushSubscription.user_id == user_id)
    ).all()

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "icon": "/icons/icon-192.png",
        "badge": "/icons/icon-192.png",
        "tag": tag,
    })

    for sub in subs:
        subscription_info = {
            "endpoint": sub.endpoint,
            "keys": {
                "p256dh": sub.p256dh,
                "auth": sub.auth,
            },
        }
        try:
            webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
            )
        except WebPushException:
            # Subscription expired or invalid, remove it
            session.delete(sub)
            session.commit()
        except Exception:
            traceback.print_exc()


def send_push_to_partner(user: User, title: str, body: str, url: str = "/", session: Session = None, tag: str = "amory"):
    """Send push notification to the user's partner."""
    if not session or not user.couple_id:
        return
    # Find partner
    partners = session.exec(
        select(User).where(
            User.couple_id == user.couple_id,
            User.id != user.id,
        )
    ).all()
    for partner in partners:
        send_push_to_user(partner.id, title, body, url, session, tag)


@router.post("/test")
def test_notification(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Send a test notification to the current user."""
    send_push_to_user(user.id, "Amory", "通知正常运行！💕", "/", session)
    return {"ok": True}


# Cache: {user_id: last_date_checked} to avoid spamming notifications
_reminder_cache: dict[int, str] = {}


@router.post("/check-reminders")
def check_event_reminders(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Check for today's and tomorrow's calendar events. Only notifies the current user, once per day."""
    if not user.couple_id:
        return {"reminders_sent": 0}

    today = date.today()
    cache_key = user.id
    today_str = today.isoformat()

    # Only send reminders once per user per day
    if _reminder_cache.get(cache_key) == today_str:
        return {"reminders_sent": 0}
    _reminder_cache[cache_key] = today_str

    couple_id = user.couple_id
    tomorrow = today + timedelta(days=1)

    events = session.exec(
        select(SharedCalendarEvent).where(SharedCalendarEvent.couple_id == couple_id)
    ).all()

    reminders_sent = 0

    for ev in events:
        ev_date = date.fromisoformat(ev.event_date)
        matches_today = False
        matches_tomorrow = False

        if ev.recurring == "yearly":
            this_year_date = ev_date.replace(year=today.year)
            matches_today = this_year_date == today
            matches_tomorrow = this_year_date == tomorrow
        elif ev.recurring == "monthly":
            try:
                this_month_date = ev_date.replace(year=today.year, month=today.month)
                matches_today = this_month_date == today
                matches_tomorrow = this_month_date == tomorrow
            except ValueError:
                pass
        elif ev.recurring == "weekly":
            matches_today = ev_date.weekday() == today.weekday()
            matches_tomorrow = ev_date.weekday() == tomorrow.weekday()
        else:
            matches_today = ev_date == today
            matches_tomorrow = ev_date == tomorrow

        if matches_today:
            send_push_to_user(user.id, "今天！", f"{ev.title}", "/more", session)
            reminders_sent += 1
        elif matches_tomorrow:
            send_push_to_user(user.id, "明天", f"{ev.title}就在明天！", "/more", session)
            reminders_sent += 1

    # Also check anniversary
    couple = session.get(Couple, couple_id)
    if couple and couple.anniversary_date:
        ann_date = couple.anniversary_date
        ann_this_year = ann_date.replace(year=today.year)
        if hasattr(ann_this_year, "date"):
            ann_this_year = ann_this_year.date()
        if ann_this_year == today:
            years = today.year - ann_date.year
            send_push_to_user(user.id, "纪念日快乐！", f"今天是你们在一起{years}周年！", "/", session)
            reminders_sent += 1
        elif ann_this_year == tomorrow:
            send_push_to_user(user.id, "明天是你们的纪念日！", "别忘了庆祝", "/", session)
            reminders_sent += 1

    return {"reminders_sent": reminders_sent}
