from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import (
    WishlistItemCreate, WishlistItemUpdate, WishlistItemComplete, WishlistItemResponse,
)
from app.routes.extras import award_xp

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


@router.get("/", response_model=list[WishlistItemResponse])
def get_wishlist(category: str = None, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    query = select(WishlistItem).where(WishlistItem.couple_id == couple_id)
    if category:
        query = query.where(WishlistItem.category == category)
    items = session.exec(query.order_by(WishlistItem.created_at.desc())).all()

    # Filter secret items: only show to the creator (not the partner)
    result = []
    for item in items:
        if item.is_secret and item.added_by != user.id:
            continue  # Don't show partner's secret gifts to you
        result.append(WishlistItemResponse(
            id=item.id, couple_id=item.couple_id, added_by=item.added_by,
            category=item.category, title=item.title, description=item.description,
            url=item.url, image_url=item.image_url, completed=item.completed,
            rating=item.rating, review=item.review, is_secret=item.is_secret,
            created_at=item.created_at, completed_at=item.completed_at,
        ))
    return result


@router.post("/", response_model=WishlistItemResponse)
def create_wishlist_item(data: WishlistItemCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)

    # For secret items, set visible_to as the creator (only they should see it)
    visible_to = None
    if data.is_secret:
        visible_to = user.id

    item = WishlistItem(
        couple_id=couple_id, added_by=user.id, visible_to=visible_to,
        **data.model_dump(),
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    try:
        award_xp(couple_id, user.id, "wishlist_added", 3, session)
    except Exception:
        pass
    return WishlistItemResponse(
        id=item.id, couple_id=item.couple_id, added_by=item.added_by,
        category=item.category, title=item.title, description=item.description,
        url=item.url, image_url=item.image_url, completed=item.completed,
        rating=item.rating, review=item.review, is_secret=item.is_secret,
        created_at=item.created_at, completed_at=item.completed_at,
    )


@router.put("/{item_id}", response_model=WishlistItemResponse)
def update_wishlist_item(item_id: int, data: WishlistItemUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    item = session.get(WishlistItem, item_id)
    if not item or item.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="心愿未找到")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    session.add(item)
    session.commit()
    session.refresh(item)
    return WishlistItemResponse(
        id=item.id, couple_id=item.couple_id, added_by=item.added_by,
        category=item.category, title=item.title, description=item.description,
        url=item.url, image_url=item.image_url, completed=item.completed,
        rating=item.rating, review=item.review, is_secret=item.is_secret,
        created_at=item.created_at, completed_at=item.completed_at,
    )


@router.put("/{item_id}/complete", response_model=WishlistItemResponse)
def complete_wishlist_item(item_id: int, data: WishlistItemComplete, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    item = session.get(WishlistItem, item_id)
    if not item or item.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="心愿未找到")

    item.completed = True
    item.completed_at = datetime.utcnow()
    item.rating = data.rating
    item.review = data.review
    session.add(item)
    session.commit()
    session.refresh(item)
    return WishlistItemResponse(
        id=item.id, couple_id=item.couple_id, added_by=item.added_by,
        category=item.category, title=item.title, description=item.description,
        url=item.url, image_url=item.image_url, completed=item.completed,
        rating=item.rating, review=item.review, is_secret=item.is_secret,
        created_at=item.created_at, completed_at=item.completed_at,
    )


@router.delete("/{item_id}")
def delete_wishlist_item(item_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    item = session.get(WishlistItem, item_id)
    if not item or item.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="心愿未找到")
    session.delete(item)
    session.commit()
    return {"ok": True}
