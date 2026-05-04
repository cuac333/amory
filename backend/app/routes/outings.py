import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.outing import Outing, OutingVote, OutingDocument, BucketListItem
from app.schemas.outing import (
    OutingCreate, OutingUpdate, OutingResponse, OutingVoteCreate,
    BucketListItemCreate, BucketListItemResponse,
)
from app.config import UPLOADS_IMAGES_DIR
from app.routes.extras import award_xp

router = APIRouter(prefix="/outings", tags=["outings"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


def build_outing_response(outing: Outing, session: Session) -> OutingResponse:
    proposer = session.get(User, outing.proposed_by)
    # Gather who has voted (approved)
    votes = session.exec(
        select(OutingVote).where(OutingVote.outing_id == outing.id, OutingVote.approved == True)
    ).all()
    voter_ids = set(str(v.user_id) for v in votes)
    voted_by = ",".join(voter_ids) if voter_ids else None

    # Auto-fix: if both voted but status is still "proposed", correct it
    if len(voter_ids) >= 2 and outing.status == "proposed":
        outing.status = "approved"
        session.add(outing)
        session.commit()
        session.refresh(outing)

    # Auto-fix: if both confirmed complete but status is still "approved", correct it
    if outing.complete_confirmed_by:
        confirmed = set(outing.complete_confirmed_by.split(","))
        if len(confirmed) >= 2 and outing.status == "approved":
            outing.status = "completed"
            outing.completed_at = datetime.utcnow()
            session.add(outing)
            session.commit()
            session.refresh(outing)

    # Gather who has documented
    docs = session.exec(
        select(OutingDocument).where(OutingDocument.outing_id == outing.id)
    ).all()
    doc_user_ids = set(str(d.user_id) for d in docs)
    documented_by = ",".join(doc_user_ids) if doc_user_ids else None
    return OutingResponse(
        id=outing.id, couple_id=outing.couple_id, proposed_by=outing.proposed_by,
        proposed_by_name=proposer.name if proposer else "",
        title=outing.title, description=outing.description,
        place=outing.place, place_url=outing.place_url,
        latitude=outing.latitude, longitude=outing.longitude,
        category=outing.category, proposed_date=outing.proposed_date,
        status=outing.status, created_at=outing.created_at,
        completed_at=outing.completed_at,
        voted_by=voted_by,
        complete_confirmed_by=outing.complete_confirmed_by,
        documented_by=documented_by,
    )


@router.get("/", response_model=list[OutingResponse])
def get_outings(status: str = None, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    query = select(Outing).where(Outing.couple_id == couple_id)
    if status:
        query = query.where(Outing.status == status)
    query = query.order_by(Outing.created_at.desc())
    outings = session.exec(query).all()
    return [build_outing_response(o, session) for o in outings]


@router.post("/", response_model=OutingResponse)
def create_outing(data: OutingCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    outing = Outing(couple_id=couple_id, proposed_by=user.id, **data.model_dump())
    session.add(outing)
    session.commit()
    session.refresh(outing)
    try:
        award_xp(couple_id, user.id, "outing_created", 15, session)
    except Exception:
        pass
    return build_outing_response(outing, session)


@router.put("/{outing_id}", response_model=OutingResponse)
def update_outing(outing_id: int, data: OutingUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    outing = session.get(Outing, outing_id)
    if not outing or outing.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(outing, key, value)
    session.add(outing)
    session.commit()
    session.refresh(outing)
    return build_outing_response(outing, session)


@router.post("/{outing_id}/vote")
def vote_outing(outing_id: int, data: OutingVoteCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    outing = session.get(Outing, outing_id)
    if not outing or outing.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    # Check if user already voted — no duplicate vote
    existing = session.exec(
        select(OutingVote).where(OutingVote.outing_id == outing_id, OutingVote.user_id == user.id)
    ).first()
    if not existing:
        vote = OutingVote(outing_id=outing_id, user_id=user.id, approved=data.approved, suggestion=data.suggestion)
        session.add(vote)
        session.flush()

    # Always re-check vote count and update status if needed
    all_votes = session.exec(
        select(OutingVote).where(OutingVote.outing_id == outing_id, OutingVote.approved == True)
    ).all()
    if len(set(v.user_id for v in all_votes)) >= 2 and outing.status == "proposed":
        outing.status = "approved"
        session.add(outing)
    session.commit()
    return {"ok": True, "status": outing.status}


@router.put("/{outing_id}/complete")
def complete_outing(outing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    outing = session.get(Outing, outing_id)
    if not outing or outing.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    uid = str(user.id)
    confirmed = set(outing.complete_confirmed_by.split(",")) if outing.complete_confirmed_by else set()
    confirmed.add(uid)

    outing.complete_confirmed_by = ",".join(confirmed)

    # Completed only when both partners confirm
    if len(confirmed) >= 2:
        outing.status = "completed"
        outing.completed_at = datetime.utcnow()
    session.add(outing)
    session.commit()
    return {"ok": True, "status": outing.status, "complete_confirmed_by": outing.complete_confirmed_by}


@router.post("/{outing_id}/document")
def document_outing(
    outing_id: int,
    description: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    outing = session.get(Outing, outing_id)
    if not outing or outing.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"outing_{outing_id}_{user.id}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = OutingDocument(
        outing_id=outing_id, user_id=user.id,
        photo_url=f"/uploads/images/{filename}", description=description,
    )
    session.add(doc)
    outing.status = "documented"
    session.add(outing)
    session.commit()
    session.refresh(doc)
    return {"ok": True, "photo_url": doc.photo_url}


@router.get("/{outing_id}/documents")
def get_outing_documents(outing_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    outing = session.get(Outing, outing_id)
    if not outing or outing.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Salida no encontrada")

    docs = session.exec(
        select(OutingDocument).where(OutingDocument.outing_id == outing_id)
        .order_by(OutingDocument.created_at.desc())
    ).all()
    result = []
    for d in docs:
        u = session.get(User, d.user_id)
        result.append({
            "id": d.id, "outing_id": d.outing_id, "user_id": d.user_id,
            "user_name": u.name if u else "", "photo_url": d.photo_url,
            "description": d.description, "created_at": d.created_at.isoformat(),
        })
    return result


# --- Bucket List ---

@router.get("/bucket-list", response_model=list[BucketListItemResponse])
def get_bucket_list(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    items = session.exec(
        select(BucketListItem).where(BucketListItem.couple_id == couple_id)
        .order_by(BucketListItem.created_at)
    ).all()
    return [BucketListItemResponse(
        id=i.id, couple_id=i.couple_id, added_by=i.added_by,
        title=i.title, description=i.description, category=i.category,
        completed=i.completed, completed_at=i.completed_at,
        confirmed_by=i.confirmed_by, created_at=i.created_at,
    ) for i in items]


@router.post("/bucket-list", response_model=BucketListItemResponse)
def add_bucket_item(data: BucketListItemCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    item = BucketListItem(couple_id=couple_id, added_by=user.id, **data.model_dump())
    session.add(item)
    session.commit()
    session.refresh(item)
    return BucketListItemResponse(
        id=item.id, couple_id=item.couple_id, added_by=item.added_by,
        title=item.title, description=item.description, category=item.category,
        completed=item.completed, completed_at=item.completed_at,
        confirmed_by=item.confirmed_by, created_at=item.created_at,
    )


@router.put("/bucket-list/{item_id}/toggle")
def toggle_bucket_item(item_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    item = session.get(BucketListItem, item_id)
    if not item or item.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    uid = str(user.id)
    confirmed = set(item.confirmed_by.split(",")) if item.confirmed_by else set()

    if uid in confirmed:
        # User un-confirms
        confirmed.discard(uid)
    else:
        # User confirms
        confirmed.add(uid)

    item.confirmed_by = ",".join(confirmed) if confirmed else None
    # Completed only when both partners have confirmed (2 users)
    item.completed = len(confirmed) >= 2
    item.completed_at = datetime.utcnow() if item.completed else None
    session.add(item)
    session.commit()
    return {"completed": item.completed, "confirmed_by": item.confirmed_by}
