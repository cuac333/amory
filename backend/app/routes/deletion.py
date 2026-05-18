from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.routes.notification import send_push_to_partner
from app.models.user import User
from app.models.deletion import DeletionRequest
from app.models.monthly import MonthlyActivity, MonthlyEntry
from app.models.outing import Outing, BucketListItem
from app.models.wishlist import WishlistItem
from app.models.diary import DiaryEntry, DiaryComment
from app.models.extras import (
    TimeCapsule, OpenWhenLetter, MemoryPin, ScratchCard, Voucher,
    SecretLetterGame, LoveReason, EventCountdown, BingoCell,
    WhosMostLikely, WhosMostLikelyVote, QuizQuestion, QuizAnswer,
    SpinnerOption, TruthOrDare,
)
from app.models.content import DreamItem, SharedSong, Recipe, TimelineEvent
from app.models.gamification import WeeklyChallenge, DateExpense, SharedCalendarEvent
from app.schemas.deletion import DeletionRequestCreate, DeletionRequestResponse

router = APIRouter(prefix="/deletion-requests", tags=["deletion"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


ENTITY_MODEL_MAP = {
    "monthly_activity": MonthlyActivity,
    "outing": Outing,
    "wishlist_item": WishlistItem,
    "diary_entry": DiaryEntry,
    "bucket_list_item": BucketListItem,
    "time_capsule": TimeCapsule,
    "open_when_letter": OpenWhenLetter,
    "memory_pin": MemoryPin,
    "scratch_card": ScratchCard,
    "voucher": Voucher,
    "secret_letter": SecretLetterGame,
    "love_reason": LoveReason,
    "event_countdown": EventCountdown,
    "bingo_cell": BingoCell,
    "whos_most_likely": WhosMostLikely,
    "quiz_question": QuizQuestion,
    "spinner_option": SpinnerOption,
    "truth_or_dare": TruthOrDare,
    "dream_item": DreamItem,
    "shared_song": SharedSong,
    "recipe": Recipe,
    "timeline_event": TimelineEvent,
    "weekly_challenge": WeeklyChallenge,
    "date_expense": DateExpense,
    "shared_calendar_event": SharedCalendarEvent,
}


def get_entity_title(entity_type: str, entity_id: int, session: Session) -> str:
    """Get a display title for the entity being requested for deletion."""
    model = ENTITY_MODEL_MAP.get(entity_type)
    if not model:
        return "未知元素"
    entity = session.get(model, entity_id)
    if not entity:
        return "已删除的元素"
    if hasattr(entity, "title"):
        return entity.title
    if hasattr(entity, "text"):
        t = entity.text
        return t[:60] + ("..." if len(t) > 60 else "")
    if hasattr(entity, "content"):
        t = entity.content
        return t[:60] + ("..." if len(t) > 60 else "")
    if hasattr(entity, "question"):
        return entity.question[:60]
    return f"{entity_type} #{entity_id}"


def validate_entity_belongs_to_couple(entity_type: str, entity_id: int, couple_id: int, session: Session):
    """Validate the entity exists and belongs to the couple."""
    model = ENTITY_MODEL_MAP.get(entity_type)
    if not model:
        raise HTTPException(status_code=400, detail="无效的实体类型")
    entity = session.get(model, entity_id)
    if not entity or entity.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="元素未找到")


def delete_entity(entity_type: str, entity_id: int, session: Session):
    """Actually delete the entity from the database."""
    # Handle cascading deletes for special cases
    if entity_type == "monthly_activity":
        entries = session.exec(
            select(MonthlyEntry).where(MonthlyEntry.activity_id == entity_id)
        ).all()
        for entry in entries:
            session.delete(entry)
    elif entity_type == "quiz_question":
        answers = session.exec(
            select(QuizAnswer).where(QuizAnswer.question_id == entity_id)
        ).all()
        for a in answers:
            session.delete(a)
    elif entity_type == "whos_most_likely":
        votes = session.exec(
            select(WhosMostLikelyVote).where(WhosMostLikelyVote.question_id == entity_id)
        ).all()
        for v in votes:
            session.delete(v)
    elif entity_type == "diary_entry":
        comments = session.exec(
            select(DiaryComment).where(DiaryComment.diary_entry_id == entity_id)
        ).all()
        for c in comments:
            session.delete(c)

    model = ENTITY_MODEL_MAP.get(entity_type)
    if model:
        entity = session.get(model, entity_id)
        if entity:
            session.delete(entity)


def build_response(req: DeletionRequest, session: Session) -> DeletionRequestResponse:
    requester = session.get(User, req.requested_by)
    return DeletionRequestResponse(
        id=req.id,
        couple_id=req.couple_id,
        requested_by=req.requested_by,
        requested_by_name=requester.name if requester else "",
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        entity_title=req.entity_title,
        status=req.status,
        created_at=req.created_at,
        resolved_at=req.resolved_at,
        resolved_by=req.resolved_by,
    )


@router.get("/", response_model=list[DeletionRequestResponse])
def get_deletion_requests(
    entity_type: str = None,
    status: str = "pending",
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    query = select(DeletionRequest).where(
        DeletionRequest.couple_id == couple_id,
    )
    if entity_type:
        query = query.where(DeletionRequest.entity_type == entity_type)
    if status:
        query = query.where(DeletionRequest.status == status)
    query = query.order_by(DeletionRequest.created_at.desc())
    requests = session.exec(query).all()
    return [build_response(r, session) for r in requests]


@router.post("/", response_model=DeletionRequestResponse)
def request_deletion(
    data: DeletionRequestCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    validate_entity_belongs_to_couple(data.entity_type, data.entity_id, couple_id, session)

    # Check if there's already a pending request for this entity
    existing = session.exec(
        select(DeletionRequest).where(
            DeletionRequest.couple_id == couple_id,
            DeletionRequest.entity_type == data.entity_type,
            DeletionRequest.entity_id == data.entity_id,
            DeletionRequest.status == "pending",
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该元素已有待处理的删除请求")

    entity_title = get_entity_title(data.entity_type, data.entity_id, session)

    req = DeletionRequest(
        couple_id=couple_id,
        requested_by=user.id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        entity_title=entity_title,
    )
    session.add(req)
    session.commit()
    session.refresh(req)
    send_push_to_partner(user, "删除请求", f"{user.name}想删除: {entity_title[:50]}", "/settings", session)
    return build_response(req, session)


@router.put("/{request_id}/approve")
def approve_deletion(
    request_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    req = session.get(DeletionRequest, request_id)
    if not req or req.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="请求未找到")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="此请求已处理")
    if req.requested_by == user.id:
        raise HTTPException(status_code=400, detail="你不能批准自己的请求")

    # Approve and delete the entity
    req.status = "approved"
    req.resolved_at = datetime.utcnow()
    req.resolved_by = user.id
    session.add(req)

    delete_entity(req.entity_type, req.entity_id, session)
    session.commit()
    return {"ok": True, "message": "经双方同意已删除元素"}


@router.put("/{request_id}/reject")
def reject_deletion(
    request_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    req = session.get(DeletionRequest, request_id)
    if not req or req.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="请求未找到")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="此请求已处理")
    if req.requested_by == user.id:
        raise HTTPException(status_code=400, detail="你不能拒绝自己的请求，请改为取消")

    req.status = "rejected"
    req.resolved_at = datetime.utcnow()
    req.resolved_by = user.id
    session.add(req)
    session.commit()
    return {"ok": True, "message": "删除请求已拒绝"}


@router.delete("/{request_id}/cancel")
def cancel_deletion(
    request_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    req = session.get(DeletionRequest, request_id)
    if not req or req.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="请求未找到")
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="此请求已处理")
    if req.requested_by != user.id:
        raise HTTPException(status_code=400, detail="只有发起者可以取消")

    session.delete(req)
    session.commit()
    return {"ok": True, "message": "请求已取消"}
