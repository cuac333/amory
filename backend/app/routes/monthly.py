import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.monthly import MonthlyActivity, MonthlyEntry, Streak
from app.models.book import BookPage
from app.schemas.monthly import (
    MonthlyActivityCreate, MonthlyActivityResponse,
    MonthlyEntryResponse, StreakResponse,
)
from app.config import UPLOADS_IMAGES_DIR
from app.routes.extras import award_xp

router = APIRouter(prefix="/monthly", tags=["monthly"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


def get_or_create_streak(couple_id: int, session: Session) -> Streak:
    streak = session.exec(select(Streak).where(Streak.couple_id == couple_id)).first()
    if not streak:
        streak = Streak(couple_id=couple_id)
        session.add(streak)
        session.commit()
        session.refresh(streak)
    return streak


def build_activity_response(activity: MonthlyActivity, session: Session) -> MonthlyActivityResponse:
    entries = session.exec(
        select(MonthlyEntry).where(MonthlyEntry.activity_id == activity.id)
    ).all()
    entry_responses = []
    for e in entries:
        author = session.get(User, e.user_id)
        entry_responses.append(MonthlyEntryResponse(
            id=e.id, activity_id=e.activity_id, user_id=e.user_id,
            user_name=author.name if author else "", photo_url=e.photo_url,
            feeling_text=e.feeling_text, created_at=e.created_at,
        ))
    return MonthlyActivityResponse(
        id=activity.id, couple_id=activity.couple_id, month=activity.month,
        year=activity.year, title=activity.title, description=activity.description,
        category=activity.category, status=activity.status,
        created_at=activity.created_at, completed_at=activity.completed_at,
        entries=entry_responses,
    )


@router.get("/current", response_model=MonthlyActivityResponse)
def get_current_activity(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    now = datetime.utcnow()
    activity = session.exec(
        select(MonthlyActivity).where(
            MonthlyActivity.couple_id == couple_id,
            MonthlyActivity.month == now.month,
            MonthlyActivity.year == now.year,
        )
    ).first()
    if not activity:
        raise HTTPException(status_code=404, detail="No hay actividad asignada para este mes")
    return build_activity_response(activity, session)


@router.get("/history", response_model=list[MonthlyActivityResponse])
def get_history(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    activities = session.exec(
        select(MonthlyActivity).where(MonthlyActivity.couple_id == couple_id)
        .order_by(MonthlyActivity.year.desc(), MonthlyActivity.month.desc())
    ).all()
    return [build_activity_response(a, session) for a in activities]


@router.post("/", response_model=MonthlyActivityResponse)
def create_activity(data: MonthlyActivityCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)

    existing = session.exec(
        select(MonthlyActivity).where(
            MonthlyActivity.couple_id == couple_id,
            MonthlyActivity.month == data.month,
            MonthlyActivity.year == data.year,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una actividad para ese mes")

    # Check previous month is completed (blocking logic)
    if data.month == 1:
        prev_month, prev_year = 12, data.year - 1
    else:
        prev_month, prev_year = data.month - 1, data.year

    prev_activity = session.exec(
        select(MonthlyActivity).where(
            MonthlyActivity.couple_id == couple_id,
            MonthlyActivity.month == prev_month,
            MonthlyActivity.year == prev_year,
        )
    ).first()
    if prev_activity and prev_activity.status != "completed":
        raise HTTPException(status_code=400, detail=f"Deben completar la actividad de {prev_month}/{prev_year} primero")

    activity = MonthlyActivity(couple_id=couple_id, created_by=user.id, **data.model_dump())
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return build_activity_response(activity, session)


@router.post("/{activity_id}/entry", response_model=MonthlyEntryResponse)
def submit_entry(
    activity_id: int,
    feeling_text: str = Form(..., min_length=50),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    activity = session.get(MonthlyActivity, activity_id)
    if not activity or activity.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")

    existing_entry = session.exec(
        select(MonthlyEntry).where(
            MonthlyEntry.activity_id == activity_id,
            MonthlyEntry.user_id == user.id,
        )
    ).first()
    if existing_entry:
        raise HTTPException(status_code=400, detail="Ya subiste tu entrada para esta actividad")

    # Save photo
    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"monthly_{activity_id}_{user.id}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    entry = MonthlyEntry(
        activity_id=activity_id,
        user_id=user.id,
        photo_url=f"/uploads/images/{filename}",
        feeling_text=feeling_text,
    )
    session.add(entry)

    # Update activity status
    all_entries = session.exec(
        select(MonthlyEntry).where(MonthlyEntry.activity_id == activity_id)
    ).all()
    total_entries = len(all_entries) + 1  # +1 for current

    if total_entries >= 2:
        activity.status = "completed"
        activity.completed_at = datetime.utcnow()

        # Update streak
        streak = get_or_create_streak(couple_id, session)
        streak.current_streak += 1
        if streak.current_streak > streak.best_streak:
            streak.best_streak = streak.current_streak
        streak.last_completed_month = activity.month
        streak.last_completed_year = activity.year
        session.add(streak)

        # Auto-generate book page
        book_page = BookPage(
            couple_id=couple_id,
            created_by=user.id,
            title=f"{activity.title} - {activity.month}/{activity.year}",
            photo_url=entry.photo_url,
            text=feeling_text,
            page_type="inner",
            order=999,
        )
        session.add(book_page)
    else:
        activity.status = "waiting_partner"

    session.add(activity)
    session.commit()
    session.refresh(entry)
    try:
        award_xp(couple_id, user.id, "monthly_entry", 20, session)
    except Exception:
        pass

    return MonthlyEntryResponse(
        id=entry.id, activity_id=entry.activity_id, user_id=entry.user_id,
        user_name=user.name, photo_url=entry.photo_url,
        feeling_text=entry.feeling_text, created_at=entry.created_at,
    )


@router.get("/streak", response_model=StreakResponse)
def get_streak(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    streak = get_or_create_streak(couple_id, session)
    return StreakResponse(
        current_streak=streak.current_streak, best_streak=streak.best_streak,
        last_completed_month=streak.last_completed_month,
        last_completed_year=streak.last_completed_year,
    )
