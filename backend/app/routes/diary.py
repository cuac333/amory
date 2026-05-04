import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.diary import DiaryEntry
from app.schemas.diary import (
    DiaryEntryCreate, DiaryEntryUpdate, DiaryEntryResponse, MoodEntry,
)
from app.config import UPLOADS_IMAGES_DIR
from app.routes.extras import award_xp

router = APIRouter(prefix="/diary", tags=["diary"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


def build_entry_response(entry: DiaryEntry, session: Session) -> DiaryEntryResponse:
    author = session.get(User, entry.user_id)
    return DiaryEntryResponse(
        id=entry.id, couple_id=entry.couple_id, user_id=entry.user_id,
        user_name=author.name if author else "", content=entry.content,
        mood=entry.mood, photo_url=entry.photo_url, is_shared=entry.is_shared,
        created_at=entry.created_at, updated_at=entry.updated_at,
    )


@router.get("/", response_model=list[DiaryEntryResponse])
def get_entries(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    entries = session.exec(
        select(DiaryEntry).where(DiaryEntry.couple_id == couple_id)
        .order_by(DiaryEntry.created_at.desc())
    ).all()
    result = []
    for entry in entries:
        # Show own entries (shared or private) + partner's shared entries
        if entry.user_id == user.id or entry.is_shared:
            result.append(build_entry_response(entry, session))
    return result


@router.post("/", response_model=DiaryEntryResponse)
def create_entry(data: DiaryEntryCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    entry = DiaryEntry(
        couple_id=couple_id, user_id=user.id,
        content=data.content, mood=data.mood, is_shared=data.is_shared,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    try:
        award_xp(couple_id, user.id, "diary_entry", 5, session)
    except Exception:
        pass
    return build_entry_response(entry, session)


@router.put("/{entry_id}", response_model=DiaryEntryResponse)
def update_entry(entry_id: int, data: DiaryEntryUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    entry.updated_at = datetime.utcnow()
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return build_entry_response(entry, session)


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")
    session.delete(entry)
    session.commit()
    return {"ok": True}


@router.post("/{entry_id}/upload-photo")
def upload_diary_photo(entry_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")

    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"diary_{entry_id}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    entry.photo_url = f"/uploads/images/{filename}"
    session.add(entry)
    session.commit()
    return {"photo_url": entry.photo_url}


@router.get("/moods", response_model=list[MoodEntry])
def get_moods(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    entries = session.exec(
        select(DiaryEntry).where(
            DiaryEntry.couple_id == couple_id,
            DiaryEntry.mood.isnot(None),
        ).order_by(DiaryEntry.created_at)
    ).all()
    return [
        MoodEntry(
            date=e.created_at.strftime("%Y-%m-%d"),
            mood=e.mood, user_id=e.user_id,
        ) for e in entries if e.is_shared or e.user_id == user.id
    ]
