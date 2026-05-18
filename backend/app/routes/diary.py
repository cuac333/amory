import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.diary import DiaryEntry, DiaryComment
from app.schemas.diary import (
    DiaryEntryCreate, DiaryEntryUpdate, DiaryEntryResponse, MoodEntry,
    DiaryCommentCreate, DiaryCommentResponse,
)
from app.config import UPLOADS_IMAGES_DIR
from app.routes.extras import award_xp

router = APIRouter(prefix="/diary", tags=["diary"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


def build_entry_response(entry: DiaryEntry, session: Session) -> DiaryEntryResponse:
    author = session.get(User, entry.user_id)
    comments_count = session.exec(
        select(func.count(DiaryComment.id)).where(DiaryComment.diary_entry_id == entry.id)
    ).one()
    return DiaryEntryResponse(
        id=entry.id, couple_id=entry.couple_id, user_id=entry.user_id,
        user_name=author.name if author else "", content=entry.content,
        mood=entry.mood, photo_url=entry.photo_url, is_shared=entry.is_shared,
        created_at=entry.created_at, updated_at=entry.updated_at,
        comments_count=comments_count,
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
        raise HTTPException(status_code=404, detail="日记未找到")

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
        raise HTTPException(status_code=404, detail="日记未找到")
    session.delete(entry)
    session.commit()
    return {"ok": True}


@router.post("/{entry_id}/upload-photo")
def upload_diary_photo(entry_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry or entry.user_id != user.id:
        raise HTTPException(status_code=404, detail="日记未找到")

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


# --- Diary Comments ---

@router.get("/{entry_id}/comments", response_model=list[DiaryCommentResponse])
def get_diary_comments(entry_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="日记未找到")
    # Only allow comments on shared entries or own entries
    if not entry.is_shared and entry.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权评论此日记")
    comments = session.exec(
        select(DiaryComment).where(DiaryComment.diary_entry_id == entry_id).order_by(DiaryComment.created_at)
    ).all()
    result = []
    for c in comments:
        author = session.get(User, c.user_id)
        result.append(DiaryCommentResponse(
            id=c.id, diary_entry_id=c.diary_entry_id, user_id=c.user_id,
            user_name=author.name if author else "", content=c.content, created_at=c.created_at,
        ))
    return result


@router.post("/{entry_id}/comments", response_model=DiaryCommentResponse)
def add_diary_comment(entry_id: int, data: DiaryCommentCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    entry = session.get(DiaryEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="日记未找到")
    if not entry.is_shared and entry.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权评论此日记")
    comment = DiaryComment(diary_entry_id=entry_id, user_id=user.id, content=data.content)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return DiaryCommentResponse(
        id=comment.id, diary_entry_id=comment.diary_entry_id, user_id=comment.user_id,
        user_name=user.name, content=comment.content, created_at=comment.created_at,
    )
