from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.book import SecretLetter, GuestBookEntry
from app.schemas.book import (
    SecretLetterCreate, SecretLetterUnlock, SecretLetterResponse,
    GuestBookEntryCreate, GuestBookEntryResponse,
)
from app.models.user import Couple

router = APIRouter(tags=["secret & guestbook"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


# --- Secret Letter ---

@router.post("/secret-letter", response_model=SecretLetterResponse)
def create_secret_letter(data: SecretLetterCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(select(SecretLetter).where(SecretLetter.couple_id == couple_id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una carta secreta")

    letter = SecretLetter(couple_id=couple_id, content=data.content, unlock_code=data.unlock_code)
    session.add(letter)
    session.commit()
    session.refresh(letter)
    return SecretLetterResponse(id=letter.id, is_unlocked=False, created_at=letter.created_at)


@router.post("/secret-letter/unlock", response_model=SecretLetterResponse)
def unlock_secret_letter(data: SecretLetterUnlock, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = session.exec(select(SecretLetter).where(SecretLetter.couple_id == couple_id)).first()
    if not letter:
        raise HTTPException(status_code=404, detail="No hay carta secreta")

    if letter.is_unlocked:
        return SecretLetterResponse(id=letter.id, content=letter.content, is_unlocked=True, created_at=letter.created_at)

    if data.code != letter.unlock_code:
        raise HTTPException(status_code=400, detail="Código incorrecto")

    letter.is_unlocked = True
    letter.unlocked_at = datetime.utcnow()
    session.add(letter)
    session.commit()
    return SecretLetterResponse(id=letter.id, content=letter.content, is_unlocked=True, created_at=letter.created_at)


@router.get("/secret-letter", response_model=SecretLetterResponse)
def get_secret_letter(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = session.exec(select(SecretLetter).where(SecretLetter.couple_id == couple_id)).first()
    if not letter:
        raise HTTPException(status_code=404, detail="No hay carta secreta")

    if letter.is_unlocked:
        return SecretLetterResponse(id=letter.id, content=letter.content, is_unlocked=True, created_at=letter.created_at)
    return SecretLetterResponse(id=letter.id, is_unlocked=False, created_at=letter.created_at)


# --- Guest Book ---

GUEST_PASSWORD = "amory2026"

@router.post("/guestbook", response_model=GuestBookEntryResponse)
def add_guestbook_entry(data: GuestBookEntryCreate, session: Session = Depends(get_session)):
    if data.guest_password != GUEST_PASSWORD:
        raise HTTPException(status_code=401, detail="Contraseña de invitado incorrecta")

    entry = GuestBookEntry(couple_id=1, author_name=data.author_name, message=data.message)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return GuestBookEntryResponse(
        id=entry.id, author_name=entry.author_name,
        message=entry.message, created_at=entry.created_at,
    )


@router.get("/guestbook", response_model=list[GuestBookEntryResponse])
def get_guestbook_entries(session: Session = Depends(get_session)):
    entries = session.exec(select(GuestBookEntry).order_by(GuestBookEntry.created_at.desc())).all()
    return [
        GuestBookEntryResponse(
            id=e.id, author_name=e.author_name,
            message=e.message, created_at=e.created_at,
        ) for e in entries
    ]
