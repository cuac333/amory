import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select, func
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.book import BookPage, Like, Comment, Reaction, Sticker, PagePhoto
from app.schemas.book import (
    BookPageCreate, BookPageUpdate, BookPageResponse, ReorderRequest,
    CommentCreate, CommentResponse, ReactionCreate, ReactionResponse,
    StickerCreate, StickerResponse,
)
from app.config import UPLOADS_IMAGES_DIR, UPLOADS_AUDIO_DIR

router = APIRouter(prefix="/book", tags=["book"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


# --- Pages CRUD ---

@router.get("/pages", response_model=list[BookPageResponse])
def get_pages(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    pages = session.exec(
        select(BookPage).where(BookPage.couple_id == couple_id).order_by(BookPage.order)
    ).all()

    result = []
    for page in pages:
        likes_count = session.exec(select(func.count(Like.id)).where(Like.page_id == page.id)).one()
        comments_count = session.exec(select(func.count(Comment.id)).where(Comment.page_id == page.id)).one()
        result.append(BookPageResponse(
            id=page.id, couple_id=page.couple_id, title=page.title,
            photo_url=page.photo_url, text=page.text, audio_url=page.audio_url,
            page_type=page.page_type, order=page.order, particle_type=page.particle_type,
            created_at=page.created_at, likes_count=likes_count, comments_count=comments_count,
        ))
    return result


@router.post("/pages", response_model=BookPageResponse)
def create_page(data: BookPageCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    page_data = data.model_dump(exclude_none=True)
    page = BookPage(couple_id=couple_id, created_by=user.id, **page_data)
    session.add(page)
    session.commit()
    session.refresh(page)
    return BookPageResponse(
        id=page.id, couple_id=page.couple_id, title=page.title,
        photo_url=page.photo_url, text=page.text, audio_url=page.audio_url,
        page_type=page.page_type, order=page.order, particle_type=page.particle_type,
        created_at=page.created_at,
    )


@router.put("/pages/{page_id}", response_model=BookPageResponse)
def update_page(page_id: int, data: BookPageUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    page = session.get(BookPage, page_id)
    if not page or page.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(page, key, value)
    session.add(page)
    session.commit()
    session.refresh(page)
    return BookPageResponse(
        id=page.id, couple_id=page.couple_id, title=page.title,
        photo_url=page.photo_url, text=page.text, audio_url=page.audio_url,
        page_type=page.page_type, order=page.order, particle_type=page.particle_type,
        created_at=page.created_at,
    )


@router.delete("/pages/{page_id}")
def delete_page(page_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    page = session.get(BookPage, page_id)
    if not page or page.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Página no encontrada")
    session.delete(page)
    session.commit()
    return {"ok": True}


@router.put("/pages/reorder")
def reorder_pages(data: ReorderRequest, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    for idx, page_id in enumerate(data.page_ids):
        page = session.get(BookPage, page_id)
        if page and page.couple_id == couple_id:
            page.order = idx
            session.add(page)
    session.commit()
    return {"ok": True}


@router.post("/pages/{page_id}/upload-photo")
def upload_photo(page_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    page = session.get(BookPage, page_id)
    if not page or page.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"page_{page_id}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    page.photo_url = f"/uploads/images/{filename}"
    session.add(page)
    session.commit()
    return {"photo_url": page.photo_url}


@router.post("/pages/{page_id}/upload-audio")
def upload_audio(page_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    page = session.get(BookPage, page_id)
    if not page or page.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    UPLOADS_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"page_{page_id}_{file.filename}"
    filepath = UPLOADS_AUDIO_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    page.audio_url = f"/uploads/audio/{filename}"
    session.add(page)
    session.commit()
    return {"audio_url": page.audio_url}


# --- Frame Photos (multiple photos per page) ---

@router.post("/pages/{page_id}/frame-photos")
def upload_frame_photo(
    page_id: int,
    frame_index: int = 0,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    page = session.get(BookPage, page_id)
    if not page or page.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Página no encontrada")

    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"frame_{page_id}_{frame_index}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    photo_url = f"/uploads/images/{filename}"

    # Upsert: replace existing photo for same page+frame_index
    existing = session.exec(
        select(PagePhoto).where(PagePhoto.page_id == page_id, PagePhoto.frame_index == frame_index)
    ).first()
    if existing:
        existing.photo_url = photo_url
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return {"id": existing.id, "photo_url": photo_url, "frame_index": frame_index}
    else:
        new_photo = PagePhoto(page_id=page_id, frame_index=frame_index, photo_url=photo_url, created_by=user.id)
        session.add(new_photo)
        session.commit()
        session.refresh(new_photo)
        return {"id": new_photo.id, "photo_url": photo_url, "frame_index": frame_index}


@router.get("/pages/{page_id}/frame-photos")
def get_frame_photos(
    page_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    require_couple(user)
    photos = session.exec(
        select(PagePhoto).where(PagePhoto.page_id == page_id).order_by(PagePhoto.frame_index)
    ).all()
    return [
        {
            "id": p.id,
            "frame_index": p.frame_index,
            "photo_url": p.photo_url,
            "caption": p.caption,
            "taken_date": p.taken_date,
            "place_name": p.place_name,
            "latitude": p.latitude,
            "longitude": p.longitude,
        }
        for p in photos
    ]


@router.put("/pages/{page_id}/frame-photos/{photo_id}")
def update_frame_photo(
    page_id: int,
    photo_id: int,
    data: dict,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    page = session.get(BookPage, page_id)
    if not page or page.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Página no encontrada")
    photo = session.get(PagePhoto, photo_id)
    if not photo or photo.page_id != page_id:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    for key in ("caption", "taken_date", "place_name", "latitude", "longitude"):
        if key in data:
            setattr(photo, key, data[key])
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return {
        "id": photo.id,
        "frame_index": photo.frame_index,
        "photo_url": photo.photo_url,
        "caption": photo.caption,
        "taken_date": photo.taken_date,
        "place_name": photo.place_name,
        "latitude": photo.latitude,
        "longitude": photo.longitude,
    }


# --- Likes ---

@router.post("/pages/{page_id}/like")
def toggle_like(page_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    existing = session.exec(
        select(Like).where(Like.page_id == page_id, Like.user_id == user.id)
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        return {"liked": False}
    like = Like(page_id=page_id, user_id=user.id)
    session.add(like)
    session.commit()
    return {"liked": True}


@router.get("/pages/{page_id}/likes")
def get_likes(page_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    count = session.exec(select(func.count(Like.id)).where(Like.page_id == page_id)).one()
    user_liked = session.exec(
        select(Like).where(Like.page_id == page_id, Like.user_id == user.id)
    ).first() is not None
    return {"count": count, "user_liked": user_liked}


# --- Comments ---

@router.post("/pages/{page_id}/comments", response_model=CommentResponse)
def add_comment(page_id: int, data: CommentCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    comment = Comment(page_id=page_id, user_id=user.id, content=data.content)
    session.add(comment)
    session.commit()
    session.refresh(comment)
    return CommentResponse(
        id=comment.id, page_id=comment.page_id, user_id=comment.user_id,
        user_name=user.name, content=comment.content, created_at=comment.created_at,
    )


@router.get("/pages/{page_id}/comments", response_model=list[CommentResponse])
def get_comments(page_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    comments = session.exec(
        select(Comment).where(Comment.page_id == page_id).order_by(Comment.created_at)
    ).all()
    result = []
    for c in comments:
        author = session.get(User, c.user_id)
        result.append(CommentResponse(
            id=c.id, page_id=c.page_id, user_id=c.user_id,
            user_name=author.name if author else "", content=c.content, created_at=c.created_at,
        ))
    return result


# --- Reactions ---

@router.post("/pages/{page_id}/reactions")
def add_reaction(page_id: int, data: ReactionCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    existing = session.exec(
        select(Reaction).where(
            Reaction.page_id == page_id, Reaction.user_id == user.id, Reaction.emoji == data.emoji
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
        return {"toggled": False}
    reaction = Reaction(page_id=page_id, user_id=user.id, emoji=data.emoji)
    session.add(reaction)
    session.commit()
    return {"toggled": True}


@router.get("/pages/{page_id}/reactions", response_model=list[ReactionResponse])
def get_reactions(page_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    reactions = session.exec(select(Reaction).where(Reaction.page_id == page_id)).all()
    emoji_counts: dict[str, int] = {}
    for r in reactions:
        emoji_counts[r.emoji] = emoji_counts.get(r.emoji, 0) + 1
    return [ReactionResponse(emoji=e, count=c) for e, c in emoji_counts.items()]


# --- Stickers ---

@router.post("/pages/{page_id}/stickers", response_model=StickerResponse)
def add_sticker(page_id: int, data: StickerCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    sticker = Sticker(page_id=page_id, user_id=user.id, **data.model_dump())
    session.add(sticker)
    session.commit()
    session.refresh(sticker)
    return StickerResponse(
        id=sticker.id, emoji=sticker.emoji, position_x=sticker.position_x,
        position_y=sticker.position_y, scale=sticker.scale, rotation=sticker.rotation,
    )


@router.get("/pages/{page_id}/stickers", response_model=list[StickerResponse])
def get_stickers(page_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    stickers = session.exec(select(Sticker).where(Sticker.page_id == page_id)).all()
    return [
        StickerResponse(
            id=s.id, emoji=s.emoji, position_x=s.position_x,
            position_y=s.position_y, scale=s.scale, rotation=s.rotation,
        ) for s in stickers
    ]
