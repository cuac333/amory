import json
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlmodel import Session, select, col
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.chat import ChatMessage, CustomSticker
from app.schemas.chat import ChatMessageCreate, ChatMessageResponse, ChatReactionUpdate
from app.config import UPLOADS_IMAGES_DIR
from app.routes.notification import send_push_to_partner
from app.routes.extras import award_xp

router = APIRouter(prefix="/chat", tags=["chat"])


def _msg_to_response(msg: ChatMessage, session: Session, sender_name: str = "") -> ChatMessageResponse:
    # Get sender name if not provided
    if not sender_name:
        sender = session.get(User, msg.sender_id)
        sender_name = sender.name if sender else "?"

    # Parse reactions
    reactions = {}
    if msg.reactions:
        try:
            reactions = json.loads(msg.reactions)
        except (json.JSONDecodeError, TypeError):
            pass

    # Get reply preview
    reply_preview = None
    if msg.reply_to_id:
        replied = session.get(ChatMessage, msg.reply_to_id)
        if replied:
            reply_preview = (replied.text or "📷 图片")[:60]

    return ChatMessageResponse(
        id=msg.id,
        couple_id=msg.couple_id,
        sender_id=msg.sender_id,
        sender_name=sender_name,
        text=msg.text,
        image_url=msg.image_url,
        reply_to_id=msg.reply_to_id,
        reply_preview=reply_preview,
        reactions=reactions,
        pinned=msg.pinned,
        created_at=msg.created_at,
    )


@router.get("/messages", response_model=list[ChatMessageResponse])
def get_messages(
    limit: int = Query(50, le=200),
    before_id: int | None = Query(None),
    pinned_only: bool = Query(False),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")

    query = select(ChatMessage).where(ChatMessage.couple_id == user.couple_id)

    if pinned_only:
        query = query.where(ChatMessage.pinned == True)

    if before_id:
        query = query.where(col(ChatMessage.id) < before_id)

    query = query.order_by(col(ChatMessage.id).desc()).limit(limit)
    messages = session.exec(query).all()

    # Cache user names
    users = session.exec(select(User).where(User.couple_id == user.couple_id)).all()
    name_map = {u.id: u.name for u in users}

    result = [_msg_to_response(m, session, name_map.get(m.sender_id, "?")) for m in messages]
    result.reverse()
    return result


@router.post("/messages", response_model=ChatMessageResponse)
def send_message(
    data: ChatMessageCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=400, detail="消息不能为空")

    msg = ChatMessage(
        couple_id=user.couple_id,
        sender_id=user.id,
        text=data.text.strip(),
        reply_to_id=data.reply_to_id,
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    text = data.text.strip() if data.text else ""
    if text.startswith("[custom-sticker:"):
        preview = "给你发了一个贴纸"
    elif text.startswith("[sticker:"):
        preview = "给你发了一个贴纸"
    else:
        preview = text[:80] or "新消息"
    send_push_to_partner(user, user.name, preview, "/chat", session, tag="amory-chat")
    try:
        award_xp(user.couple_id, user.id, "message_sent", 2, session)
    except Exception:
        pass
    return _msg_to_response(msg, session, user.name)


@router.post("/messages/{message_id}/image", response_model=ChatMessageResponse)
def send_image(
    message_id: int = 0,
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")

    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    import uuid
    filename = f"chat_{user.couple_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    msg = ChatMessage(
        couple_id=user.couple_id,
        sender_id=user.id,
        image_url=f"/uploads/images/{filename}",
    )
    session.add(msg)
    session.commit()
    session.refresh(msg)
    send_push_to_partner(user, user.name, "给你发了一张照片", "/chat", session, tag="amory-chat")
    return _msg_to_response(msg, session, user.name)


@router.post("/messages/upload-image", response_model=ChatMessageResponse)
def upload_chat_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Simpler endpoint: just upload image as a new message."""
    return send_image(0, file, user, session)


@router.post("/messages/{message_id}/react", response_model=ChatMessageResponse)
def toggle_reaction(
    message_id: int,
    data: ChatReactionUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")

    msg = session.get(ChatMessage, message_id)
    if not msg or msg.couple_id != user.couple_id:
        raise HTTPException(status_code=404, detail="消息未找到")

    reactions = {}
    if msg.reactions:
        try:
            reactions = json.loads(msg.reactions)
        except (json.JSONDecodeError, TypeError):
            pass

    emoji = data.emoji
    if emoji not in reactions:
        reactions[emoji] = []

    if user.id in reactions[emoji]:
        reactions[emoji].remove(user.id)
        if not reactions[emoji]:
            del reactions[emoji]
    else:
        reactions[emoji].append(user.id)

    msg.reactions = json.dumps(reactions)
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return _msg_to_response(msg, session)


@router.post("/messages/{message_id}/pin", response_model=ChatMessageResponse)
def toggle_pin(
    message_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")

    msg = session.get(ChatMessage, message_id)
    if not msg or msg.couple_id != user.couple_id:
        raise HTTPException(status_code=404, detail="消息未找到")

    msg.pinned = not msg.pinned
    session.add(msg)
    session.commit()
    session.refresh(msg)
    return _msg_to_response(msg, session)


@router.delete("/messages/{message_id}")
def delete_message(
    message_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")

    msg = session.get(ChatMessage, message_id)
    if not msg or msg.couple_id != user.couple_id:
        raise HTTPException(status_code=404, detail="消息未找到")
    if msg.sender_id != user.id:
        raise HTTPException(status_code=403, detail="你只能删除自己的消息")

    session.delete(msg)
    session.commit()
    return {"ok": True}


# ── Custom Stickers ──

@router.get("/stickers")
def get_custom_stickers(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    stickers = session.exec(
        select(CustomSticker)
        .where(CustomSticker.couple_id == user.couple_id)
        .order_by(col(CustomSticker.created_at).desc())
    ).all()
    return [
        {"id": s.id, "name": s.name, "image_url": s.image_url, "pack_name": s.pack_name}
        for s in stickers
    ]


@router.post("/stickers")
async def upload_custom_sticker(
    file: UploadFile = File(...),
    name: str = Query(""),
    pack_name: str = Query("custom"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")

    import uuid
    stickers_dir = UPLOADS_IMAGES_DIR.parent / "stickers"
    stickers_dir.mkdir(parents=True, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "png"
    filename = f"sticker_{user.couple_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = stickers_dir / filename
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    sticker = CustomSticker(
        couple_id=user.couple_id,
        uploaded_by=user.id,
        name=name or file.filename or "Sticker",
        image_url=f"/uploads/stickers/{filename}",
        pack_name=pack_name,
    )
    session.add(sticker)
    session.commit()
    session.refresh(sticker)
    return {"id": sticker.id, "name": sticker.name, "image_url": sticker.image_url, "pack_name": sticker.pack_name}


@router.delete("/stickers/{sticker_id}")
def delete_custom_sticker(
    sticker_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    sticker = session.get(CustomSticker, sticker_id)
    if not sticker or sticker.couple_id != user.couple_id:
        raise HTTPException(status_code=404, detail="贴纸未找到")
    session.delete(sticker)
    session.commit()
    return {"ok": True}
