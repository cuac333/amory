from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.diary import DiaryEntry
from app.models.chat import ChatMessage
from app.models.extras import TimeCapsule, OpenWhenLetter, MemoryPin, XPLog, CoupleXP
from app.models.content import DreamItem, Recipe, TimelineEvent, SharedSong

router = APIRouter(prefix="/summary", tags=["summary"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


@router.get("/weekly")
def get_weekly_summary(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    # Messages sent this week
    messages_count = session.exec(
        select(func.count(ChatMessage.id)).where(
            ChatMessage.couple_id == couple_id,
            ChatMessage.created_at >= week_ago,
        )
    ).one()

    # Diary entries this week
    diary_count = session.exec(
        select(func.count(DiaryEntry.id)).where(
            DiaryEntry.couple_id == couple_id,
            DiaryEntry.created_at >= week_ago,
        )
    ).one()

    # XP earned this week
    xp_earned = session.exec(
        select(func.coalesce(func.sum(XPLog.xp_amount), 0)).where(
            XPLog.couple_id == couple_id,
            XPLog.created_at >= week_ago,
        )
    ).one()

    # New songs added
    songs_count = session.exec(
        select(func.count(SharedSong.id)).where(
            SharedSong.couple_id == couple_id,
            SharedSong.created_at >= week_ago,
        )
    ).one()

    # New pins
    pins_count = session.exec(
        select(func.count(MemoryPin.id)).where(
            MemoryPin.couple_id == couple_id,
            MemoryPin.created_at >= week_ago,
        )
    ).one()

    # Capsules created
    capsules_count = session.exec(
        select(func.count(TimeCapsule.id)).where(
            TimeCapsule.couple_id == couple_id,
            TimeCapsule.created_at >= week_ago,
        )
    ).one()

    # Open when letters
    letters_count = session.exec(
        select(func.count(OpenWhenLetter.id)).where(
            OpenWhenLetter.couple_id == couple_id,
            OpenWhenLetter.created_at >= week_ago,
        )
    ).one()

    # Dreams completed
    dreams_completed = session.exec(
        select(func.count(DreamItem.id)).where(
            DreamItem.couple_id == couple_id,
            DreamItem.completed == True,
            DreamItem.completed_at >= week_ago,
        )
    ).one()

    # Current level
    xp_record = session.exec(
        select(CoupleXP).where(CoupleXP.couple_id == couple_id)
    ).first()

    total_xp = xp_record.total_xp if xp_record else 0
    level = xp_record.level if xp_record else 1

    # Activity score (0-100 based on engagement)
    activity_score = min(100, (
        messages_count * 2 +
        diary_count * 10 +
        songs_count * 5 +
        pins_count * 8 +
        capsules_count * 12 +
        letters_count * 10 +
        dreams_completed * 15
    ))

    # Streak: how many consecutive days had activity this week
    active_days = set()
    recent_messages = session.exec(
        select(ChatMessage.created_at).where(
            ChatMessage.couple_id == couple_id,
            ChatMessage.created_at >= week_ago,
        )
    ).all()
    for msg_time in recent_messages:
        active_days.add(msg_time.date())

    recent_diary = session.exec(
        select(DiaryEntry.created_at).where(
            DiaryEntry.couple_id == couple_id,
            DiaryEntry.created_at >= week_ago,
        )
    ).all()
    for entry_time in recent_diary:
        active_days.add(entry_time.date())

    return {
        "period": {
            "from": week_ago.isoformat(),
            "to": now.isoformat(),
        },
        "stats": {
            "messages": messages_count,
            "diary_entries": diary_count,
            "xp_earned": xp_earned,
            "songs_added": songs_count,
            "pins_added": pins_count,
            "capsules_created": capsules_count,
            "letters_created": letters_count,
            "dreams_completed": dreams_completed,
        },
        "engagement": {
            "activity_score": activity_score,
            "active_days": len(active_days),
            "total_xp": total_xp,
            "level": level,
        },
    }
