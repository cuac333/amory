import shutil
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User, Couple
from app.routes.notification import send_push_to_partner
from app.models.extras import (
    VisitCounter, QuizQuestion, QuizAnswer, MemoryPin, BookClue, ScratchCard, Voucher,
    TruthOrDare, SpinnerOption, SecretLetterGame, LoveReason,
    EventCountdown, BingoCell, WhosMostLikely, WhosMostLikelyVote,
    TimeCapsule, CoupleXP, XPLog, OpenWhenLetter, MoviePick, SongPick,
)
from app.schemas.extras import (
    QuizQuestionCreate, QuizQuestionResponse, QuizAnswerCreate, QuizAnswerResponse,
    MemoryPinCreate, MemoryPinResponse, VisitCounterResponse,
    BookClueCreate, BookClueUpdate, BookClueResponse,
    ScratchCardCreate, ScratchCardResponse,
    VoucherCreate, VoucherResponse,
    TruthOrDareCreate, TruthOrDareResponse,
    SpinnerOptionCreate, SpinnerOptionResponse,
    SecretLetterGameCreate, SecretLetterGameResponse,
    LoveReasonCreate, LoveReasonResponse,
    EventCountdownCreate, EventCountdownResponse,
    BingoCellCreate, BingoCellResponse,
    WhosMostLikelyCreate, WhosMostLikelyResponse, WhosMostLikelyVoteResponse,
    TimeCapsuleCreate, TimeCapsuleResponse,
    CoupleXPResponse, XPLogResponse,
    OpenWhenLetterCreate, OpenWhenLetterResponse,
    MoviePickCreate, MoviePickResponse,
    SongPickCreate, SongPickResponse,
)
from app.config import UPLOADS_IMAGES_DIR

router = APIRouter(tags=["extras"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


# --- Visit Counter ---

@router.post("/visits/track")
def track_visit(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    counter = session.exec(select(VisitCounter).where(VisitCounter.couple_id == couple_id)).first()
    if not counter:
        counter = VisitCounter(couple_id=couple_id, count=0)
    counter.count += 1
    counter.last_visited = datetime.utcnow()
    session.add(counter)
    session.commit()
    return {"count": counter.count}


@router.get("/visits", response_model=VisitCounterResponse)
def get_visits(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    counter = session.exec(select(VisitCounter).where(VisitCounter.couple_id == couple_id)).first()
    if not counter:
        return VisitCounterResponse(count=0, last_visited=None)
    return VisitCounterResponse(count=counter.count, last_visited=counter.last_visited)


# --- Love Counter ---

@router.get("/love-counter")
def get_love_counter(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    couple = session.get(Couple, couple_id)
    if not couple:
        raise HTTPException(status_code=404, detail="情侣未找到")

    now = datetime.utcnow()
    delta = now - couple.anniversary_date
    total_seconds = int(delta.total_seconds())
    days = delta.days
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    years = days // 365
    remaining_days = days % 365
    months = remaining_days // 30
    remaining_days = remaining_days % 30

    return {
        "anniversary_date": couple.anniversary_date.isoformat(),
        "years": years,
        "months": months,
        "days": remaining_days,
        "hours": hours,
        "minutes": minutes,
        "seconds": seconds,
        "total_days": days,
    }


# --- Quiz ---

import json as _json


def _build_question_response(q: QuizQuestion, session: Session) -> QuizQuestionResponse:
    answers = session.exec(select(QuizAnswer).where(QuizAnswer.question_id == q.id)).all()
    answer_responses = []
    for a in answers:
        author = session.get(User, a.user_id)
        answer_responses.append(QuizAnswerResponse(
            id=a.id, user_id=a.user_id,
            user_name=author.name if author else "",
            answer=a.answer, created_at=a.created_at,
        ))
    options = _json.loads(q.options) if q.options else None
    return QuizQuestionResponse(
        id=q.id, question=q.question, category=q.category,
        options=options, correct_answer=q.correct_answer,
        difficulty=q.difficulty, is_preset=q.is_preset,
        created_by=q.created_by, answers=answer_responses,
        created_at=q.created_at,
    )


@router.get("/quiz", response_model=list[QuizQuestionResponse])
def get_quiz(
    category: str = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    query = select(QuizQuestion).where(QuizQuestion.couple_id == couple_id)
    if category:
        query = query.where(QuizQuestion.category == category)
    questions = session.exec(query.order_by(QuizQuestion.created_at)).all()
    return [_build_question_response(q, session) for q in questions]


@router.get("/quiz/stats")
def get_quiz_stats(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    questions = session.exec(
        select(QuizQuestion).where(QuizQuestion.couple_id == couple_id)
    ).all()
    total = len(questions)
    matches = 0
    answered_both = 0
    by_category = {}
    for q in questions:
        answers = session.exec(select(QuizAnswer).where(QuizAnswer.question_id == q.id)).all()
        cat = q.category
        if cat not in by_category:
            by_category[cat] = {"total": 0, "answered": 0, "matches": 0}
        by_category[cat]["total"] += 1
        if len(answers) >= 2:
            answered_both += 1
            by_category[cat]["answered"] += 1
            if answers[0].answer.strip().lower() == answers[1].answer.strip().lower():
                matches += 1
                by_category[cat]["matches"] += 1
    return {
        "total_questions": total,
        "answered_both": answered_both,
        "matches": matches,
        "match_rate": round(matches / answered_both * 100) if answered_both > 0 else 0,
        "by_category": by_category,
    }


@router.post("/quiz", response_model=QuizQuestionResponse)
def create_quiz_question(data: QuizQuestionCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    options_json = _json.dumps(data.options) if data.options else None
    question = QuizQuestion(
        couple_id=couple_id, question=data.question,
        category=data.category, options=options_json,
        correct_answer=data.correct_answer, difficulty=data.difficulty,
        created_by=user.id,
    )
    session.add(question)
    session.commit()
    session.refresh(question)
    return _build_question_response(question, session)


@router.post("/quiz/seed-category")
def seed_quiz_category(
    category: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    existing = session.exec(
        select(QuizQuestion).where(
            QuizQuestion.couple_id == couple_id,
            QuizQuestion.category == category,
            QuizQuestion.is_preset == True,
        )
    ).first()
    if existing:
        return {"seeded": False, "message": "题目已全部加载"}

    from app.data.quiz_questions import QUIZ_QUESTIONS
    questions = QUIZ_QUESTIONS.get(category, [])
    count = 0
    for qdata in questions:
        options_json = _json.dumps(qdata["options"]) if qdata.get("options") else None
        q = QuizQuestion(
            couple_id=couple_id, question=qdata["question"],
            category=category, options=options_json,
            correct_answer=qdata.get("correct_answer"),
            difficulty=qdata.get("difficulty", "medium"),
            is_preset=True, created_by=user.id,
        )
        session.add(q)
        count += 1
    session.commit()
    return {"seeded": True, "count": count}


@router.post("/quiz/{question_id}/answer", response_model=QuizAnswerResponse)
def answer_quiz(question_id: int, data: QuizAnswerCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    require_couple(user)
    question = session.get(QuizQuestion, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="问题未找到")

    existing = session.exec(
        select(QuizAnswer).where(QuizAnswer.question_id == question_id, QuizAnswer.user_id == user.id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已经回答过这个问题")

    answer = QuizAnswer(question_id=question_id, user_id=user.id, answer=data.answer)
    session.add(answer)
    session.commit()
    session.refresh(answer)
    return QuizAnswerResponse(
        id=answer.id, user_id=answer.user_id, user_name=user.name,
        answer=answer.answer, created_at=answer.created_at,
    )


# --- Memory Map ---

@router.get("/map/pins", response_model=list[MemoryPinResponse])
def get_pins(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    pins = session.exec(
        select(MemoryPin).where(MemoryPin.couple_id == couple_id)
        .order_by(MemoryPin.created_at)
    ).all()
    return [MemoryPinResponse(
        id=p.id, couple_id=p.couple_id, created_by=p.created_by,
        title=p.title, description=p.description, photo_url=p.photo_url,
        latitude=p.latitude, longitude=p.longitude,
        visited_at=p.visited_at, created_at=p.created_at,
    ) for p in pins]


@router.post("/map/pins", response_model=MemoryPinResponse)
def create_pin(data: MemoryPinCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    pin = MemoryPin(couple_id=couple_id, created_by=user.id, **data.model_dump())
    session.add(pin)
    session.commit()
    session.refresh(pin)
    return MemoryPinResponse(
        id=pin.id, couple_id=pin.couple_id, created_by=pin.created_by,
        title=pin.title, description=pin.description, photo_url=pin.photo_url,
        latitude=pin.latitude, longitude=pin.longitude,
        visited_at=pin.visited_at, created_at=pin.created_at,
    )


@router.post("/map/pins/{pin_id}/upload-photo")
def upload_pin_photo(pin_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    pin = session.get(MemoryPin, pin_id)
    if not pin or pin.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="标记点未找到")

    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"pin_{pin_id}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    pin.photo_url = f"/uploads/images/{filename}"
    session.add(pin)
    session.commit()
    return {"photo_url": pin.photo_url}


@router.delete("/map/pins/{pin_id}")
def delete_pin(pin_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    pin = session.get(MemoryPin, pin_id)
    if not pin or pin.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="标记点未找到")
    session.delete(pin)
    session.commit()
    return {"ok": True}


# --- Book Clues ---

@router.get("/book-clues", response_model=list[BookClueResponse])
def get_book_clues(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以查看线索")
    clues = session.exec(
        select(BookClue).where(BookClue.couple_id == couple_id)
        .order_by(BookClue.order)
    ).all()
    return [BookClueResponse(
        id=c.id, couple_id=c.couple_id, section=c.section,
        hint_text=c.hint_text, answer_fragment=c.answer_fragment,
        order=c.order, created_at=c.created_at,
    ) for c in clues]


@router.get("/book-clues/for-section")
def get_clue_for_section(section: str, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Returns only the hint_text for a section (no answer_fragment — that's the secret!)"""
    couple_id = require_couple(user)
    clue = session.exec(
        select(BookClue).where(BookClue.couple_id == couple_id, BookClue.section == section)
    ).first()
    if not clue:
        return {"found": False}
    return {"found": True, "hint_text": clue.hint_text, "order": clue.order}


@router.post("/book-clues", response_model=BookClueResponse)
def create_book_clue(data: BookClueCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以管理线索")
    # Check if section already has a clue
    existing = session.exec(
        select(BookClue).where(BookClue.couple_id == couple_id, BookClue.section == data.section)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="该章节已有线索")
    clue = BookClue(couple_id=couple_id, created_by=user.id, **data.model_dump())
    session.add(clue)
    session.commit()
    session.refresh(clue)
    return BookClueResponse(
        id=clue.id, couple_id=clue.couple_id, section=clue.section,
        hint_text=clue.hint_text, answer_fragment=clue.answer_fragment,
        order=clue.order, created_at=clue.created_at,
    )


@router.put("/book-clues/{clue_id}", response_model=BookClueResponse)
def update_book_clue(clue_id: int, data: BookClueUpdate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以管理线索")
    clue = session.get(BookClue, clue_id)
    if not clue or clue.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="线索未找到")
    if data.section is not None:
        clue.section = data.section
    if data.hint_text is not None:
        clue.hint_text = data.hint_text
    if data.answer_fragment is not None:
        clue.answer_fragment = data.answer_fragment
    if data.order is not None:
        clue.order = data.order
    session.add(clue)
    session.commit()
    session.refresh(clue)
    return BookClueResponse(
        id=clue.id, couple_id=clue.couple_id, section=clue.section,
        hint_text=clue.hint_text, answer_fragment=clue.answer_fragment,
        order=clue.order, created_at=clue.created_at,
    )


@router.delete("/book-clues/{clue_id}")
def delete_book_clue(clue_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以管理线索")
    clue = session.get(BookClue, clue_id)
    if not clue or clue.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="线索未找到")
    session.delete(clue)
    session.commit()
    return {"ok": True}


# --- Helper: get partner user id ---

def _get_partner_id(user: User, session: Session) -> int:
    """Get the partner's user ID from the couple."""
    partner = session.exec(
        select(User).where(User.couple_id == user.couple_id, User.id != user.id)
    ).first()
    if not partner:
        raise HTTPException(status_code=400, detail="情侣不完整")
    return partner.id


# --- Scratch Cards ---

def _card_response(card: ScratchCard) -> ScratchCardResponse:
    return ScratchCardResponse(
        id=card.id, couple_id=card.couple_id,
        created_by=card.created_by, for_user_id=card.for_user_id,
        title=card.title,
        hidden_message=card.hidden_message if card.scratched_by else None,
        color=card.color, scratched_by=card.scratched_by,
        scratched_at=card.scratched_at, created_at=card.created_at,
    )


@router.get("/scratch-cards", response_model=list[ScratchCardResponse])
def get_scratch_cards(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    cards = session.exec(
        select(ScratchCard).where(ScratchCard.couple_id == couple_id)
        .order_by(ScratchCard.created_at)
    ).all()
    return [_card_response(c) for c in cards]


@router.post("/scratch-cards", response_model=ScratchCardResponse)
def create_scratch_card(data: ScratchCardCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    partner_id = _get_partner_id(user, session)
    card = ScratchCard(
        couple_id=couple_id, created_by=user.id, for_user_id=partner_id,
        title=data.title, hidden_message=data.hidden_message, color=data.color,
    )
    session.add(card)
    session.commit()
    session.refresh(card)
    return _card_response(card)


@router.post("/scratch-cards/{card_id}/scratch", response_model=ScratchCardResponse)
def scratch_card(card_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    card = session.get(ScratchCard, card_id)
    if not card or card.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="刮刮卡未找到")
    if card.scratched_by:
        raise HTTPException(status_code=400, detail="这张刮刮卡已被刮开")
    if card.for_user_id and card.for_user_id != user.id:
        raise HTTPException(status_code=403, detail="这张刮刮卡是给你伴侣的")
    card.scratched_by = user.id
    card.scratched_at = datetime.utcnow()
    session.add(card)
    session.commit()
    session.refresh(card)
    return _card_response(card)


@router.delete("/scratch-cards/{card_id}")
def delete_scratch_card(card_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    card = session.get(ScratchCard, card_id)
    if not card or card.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="刮刮卡未找到")
    if card.created_by and card.created_by != user.id:
        raise HTTPException(status_code=403, detail="只有创建者可以删除此刮刮卡")
    session.delete(card)
    session.commit()
    return {"ok": True}


# --- Vouchers (Vales) ---

def _voucher_response(v: Voucher) -> VoucherResponse:
    return VoucherResponse(
        id=v.id, couple_id=v.couple_id,
        created_by=v.created_by, for_user_id=v.for_user_id,
        title=v.title, description=v.description, icon=v.icon,
        redeemed_by=v.redeemed_by, redeemed_at=v.redeemed_at,
        created_at=v.created_at,
    )


@router.get("/vouchers", response_model=list[VoucherResponse])
def get_vouchers(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    vouchers = session.exec(
        select(Voucher).where(Voucher.couple_id == couple_id)
        .order_by(Voucher.redeemed_at.is_(None).desc(), Voucher.created_at)
    ).all()
    return [_voucher_response(v) for v in vouchers]


@router.post("/vouchers", response_model=VoucherResponse)
def create_voucher(data: VoucherCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    partner_id = _get_partner_id(user, session)
    voucher = Voucher(
        couple_id=couple_id, created_by=user.id, for_user_id=partner_id,
        title=data.title, description=data.description, icon=data.icon,
    )
    session.add(voucher)
    session.commit()
    session.refresh(voucher)
    send_push_to_partner(user, "新兑换券！", f"{user.name}给你创建了一张兑换券: {data.title}", "/more", session)
    try:
        award_xp(couple_id, user.id, "voucher_created", 10, session)
    except Exception:
        pass
    return _voucher_response(voucher)


@router.post("/vouchers/{voucher_id}/redeem", response_model=VoucherResponse)
def redeem_voucher(voucher_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    voucher = session.get(Voucher, voucher_id)
    if not voucher or voucher.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="兑换券未找到")
    if voucher.redeemed_by:
        raise HTTPException(status_code=400, detail="此兑换券已被兑换")
    if voucher.for_user_id and voucher.for_user_id != user.id:
        raise HTTPException(status_code=403, detail="此兑换券是给你伴侣的")
    voucher.redeemed_by = user.id
    voucher.redeemed_at = datetime.utcnow()
    session.add(voucher)
    session.commit()
    session.refresh(voucher)
    send_push_to_partner(user, "兑换券已兑换！", f"{user.name}兑换了兑换券: {voucher.title}", "/more", session)
    try:
        award_xp(couple_id, user.id, "voucher_redeemed", 5, session)
    except Exception:
        pass
    return _voucher_response(voucher)


@router.delete("/vouchers/{voucher_id}")
def delete_voucher(voucher_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    voucher = session.get(Voucher, voucher_id)
    if not voucher or voucher.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="兑换券未找到")
    if voucher.created_by and voucher.created_by != user.id:
        raise HTTPException(status_code=403, detail="只有创建者可以删除此兑换券")
    session.delete(voucher)
    session.commit()
    return {"ok": True}


# --- Truth or Dare ---

@router.get("/truth-or-dare", response_model=list[TruthOrDareResponse])
def get_truth_or_dare(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    cards = session.exec(
        select(TruthOrDare).where(TruthOrDare.couple_id == couple_id)
        .order_by(TruthOrDare.created_at)
    ).all()
    return cards


@router.post("/truth-or-dare", response_model=TruthOrDareResponse)
def create_truth_or_dare(data: TruthOrDareCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以添加卡片")
    card = TruthOrDare(couple_id=couple_id, **data.model_dump(), is_preset=False, created_by=user.id)
    session.add(card)
    session.commit()
    session.refresh(card)
    return card


@router.post("/truth-or-dare/seed")
def seed_truth_or_dare(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)

    existing_presets = session.exec(
        select(TruthOrDare).where(TruthOrDare.couple_id == couple_id, TruthOrDare.is_preset == True)
    ).all()
    existing_texts = {c.text for c in existing_presets}

    # ── 普通（朋友/休闲） ──
    normal_truths = [
        "你对我的第一印象是什么？",
        "你最喜欢我们关系的哪一点？",
        "你最美好的共同回忆是什么？",
        "有没有什么你一直想对我说的？",
        "你为爱做过的最尴尬的事是什么？",
        "哪首歌让你想起我？",
        "你最先注意到我的是什么？",
        "你是从什么时候确定你爱我的？",
        "不在一起的时候你最想念什么？",
        "你人生中最大的恐惧是什么？",
        "你做过的最疯狂的事是什么？",
        "你做过的最奇怪的梦是什么？",
        "你最不好意思承认的是什么？",
        '你最喜欢的"罪恶快感"电影是哪部？',
        "什么食物你可以每天都吃？",
        "你的秘密才艺是什么？",
        "如果你中了彩票你会做什么？",
        "你说过的最大的谎是什么？",
        "你手机里最让你尴尬的App是什么？",
        "你最坏的习惯是什么？",
    ]
    normal_dares = [
        "在1分钟内写一首情诗",
        "一起跳一支浪漫的舞",
        "不停地说出5件你爱对方的事",
        "模仿你们认识的经过",
        "大声地为对方唱一首歌",
        "拥抱对方30秒不松手",
        "告诉对方一件你从未说过的事",
        "为对方准备一些吃的/喝的",
        "模仿你的伴侣",
        "讲笑话直到对方笑为止",
        "打电话给一个朋友说你爱他",
        "现在就在社交媒体发一条和对方的故事",
        "给对方发一段肉麻的语音",
        "无音乐跳舞30秒",
        "让对方给你涂口红",
        "做10个深蹲同时说浪漫的话",
        "尝试用3样东西杂耍",
        "大声唱出一首歌的副歌",
        "让对方在你的社交媒体上发点东西",
        "表演你最喜欢的电影场景",
    ]

    # ── 情侣（浪漫/刺激） ──
    couples_truths = [
        "你对我有什么秘密幻想？",
        "你觉得我身体哪部分最吸引你？",
        "你最好的一次接吻是什么时候？",
        "我做什么会让你紧张？",
        "你第一次想吻我是什么时候？",
        "你对我想过的最大胆的事是什么？",
        "你喜欢主导还是被动？",
        "你最喜欢在哪里接吻？",
        "你觉得我穿什么最性感？",
        "我做什么会让你融化？",
        "你有没有做过关于我的浪漫的梦？说说看",
        "我身上最让你兴奋的是什么？",
        "我们最浪漫的一次约会是什么？",
        "你希望我们作为情侣多做什么？",
        "你希望我吻你哪里更多？",
        "你喜欢耳边低语吗？",
        "和我在一起你感受过的最强烈的时刻是什么？",
        "你喜欢慢抚还是热吻？",
        "你想重复哪一次亲密时刻？",
        "我做什么让你兴奋但我没注意到？",
    ]
    couples_dares = [
        "给对方一个电影般的吻",
        "给对方按摩脖子2分钟",
        "吻对方一个不是嘴唇的地方",
        "在耳边说一些性感的话",
        "从背后拥抱对方并亲吻脖子",
        "对视60秒不说话",
        "尽可能温柔地亲吻对方的额头",
        "抚摸对方的头发同时说甜蜜的话",
        "轻轻咬对方的下唇",
        "亲吻对方的每一根手指",
        "只脱一件衣服给对方看",
        "性感地为对方跳一支舞",
        "给对方一个爱斯基摩吻（鼻子碰鼻子）",
        "给对方按摩脚2分钟",
        "抱起对方转一圈",
        "在耳边说出3件你想对对方做的事",
        "用轻吻扫过对方的脸",
        "拥抱对方直到对方说够了",
        "在衣服下面抚摸对方的背",
        "给对方一个长长的慢吻",
    ]

    # ── 火辣（亲密/大胆） ──
    hot_truths = [
        "你最大的性幻想是什么？",
        "你最喜欢的体位是什么？",
        "你想在最冒险的地方做是什么地方？",
        "你在亲密时做过的最大胆的事是什么？",
        "你有什么没告诉我的癖好吗？",
        "你身体最敏感的部位是哪里？",
        "你喜欢开灯还是关灯做？",
        "你喜欢听dirty talk吗？",
        "你最好的一次高潮是什么时候？",
        "你想尝试什么情趣用品？",
        "在公共场所做会让你兴奋吗？",
        "你喜欢快速激烈还是缓慢温柔？",
        "你假装过高潮吗？",
        "你多久想和我做一次？",
        "你在性方面最大胆愿意做什么？",
        "你想拍亲密视频吗？",
        "你喜欢早上做还是晚上做？",
        "什么类型的内衣最让你兴奋？",
        "你喜欢口吗？",
        "你最大的兴奋点是什么？",
    ]
    hot_dares = [
        "亲吻对方的脖子30秒",
        "用牙齿脱掉对方一件衣服",
        "给对方跳一段膝上舞",
        "在耳边说出你最大胆的幻想",
        "用最热烈的方式亲吻对方",
        "用精油给对方做一次性感按摩",
        "展示你希望对方对你做的事",
        "为对方跳一段完整的脱衣舞",
        "蒙住对方的眼睛亲吻全身",
        "轻轻咬对方最喜欢的地方",
        "发一条消息描述你想对对方做的事",
        "重现一部电影中最火辣的场景",
        "在对方选择的地方亲吻",
        "让对方在想碰的地方碰你",
        "问一个性相关的问题并自己也回答",
        "在衣服下面抚摸对方1分钟",
        "告诉对方你现在想让对方做什么",
        "骑在对方身上热烈地亲吻",
        "石头剪刀布：输了的人脱一件衣服",
        "亲吻对方最敏感的地方",
    ]

    all_cards = []
    for text in normal_truths:
        all_cards.append(("truth", "normal", text))
    for text in normal_dares:
        all_cards.append(("dare", "normal", text))
    for text in couples_truths:
        all_cards.append(("truth", "couples", text))
    for text in couples_dares:
        all_cards.append(("dare", "couples", text))
    for text in hot_truths:
        all_cards.append(("truth", "hot", text))
    for text in hot_dares:
        all_cards.append(("dare", "hot", text))

    count = 0
    for card_type, category, text in all_cards:
        if text not in existing_texts:
            card = TruthOrDare(
                couple_id=couple_id, text=text, card_type=card_type,
                category=category, is_preset=True, created_by=user.id,
            )
            session.add(card)
            count += 1
    session.commit()
    return {"seeded": True, "count": count}


@router.delete("/truth-or-dare/{card_id}")
def delete_truth_or_dare(card_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以删除卡片")
    card = session.get(TruthOrDare, card_id)
    if not card or card.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="信件未找到")
    if card.is_preset:
        raise HTTPException(status_code=400, detail="无法删除预设卡片")
    session.delete(card)
    session.commit()
    return {"ok": True}


# --- Spinner (Decision Wheel) ---

@router.get("/spinner/options", response_model=list[SpinnerOptionResponse])
def get_spinner_options(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    options = session.exec(
        select(SpinnerOption).where(SpinnerOption.couple_id == couple_id)
        .order_by(SpinnerOption.created_at)
    ).all()
    return options


@router.post("/spinner/options", response_model=SpinnerOptionResponse)
def create_spinner_option(data: SpinnerOptionCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以添加选项")
    option = SpinnerOption(couple_id=couple_id, created_by=user.id, **data.model_dump())
    session.add(option)
    session.commit()
    session.refresh(option)
    return option


@router.delete("/spinner/options/{option_id}")
def delete_spinner_option(option_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以删除选项")
    option = session.get(SpinnerOption, option_id)
    if not option or option.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="选项未找到")
    session.delete(option)
    session.commit()
    return {"ok": True}


@router.post("/spinner/seed")
def seed_spinner_options(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(
        select(SpinnerOption).where(SpinnerOption.couple_id == couple_id)
    ).first()
    if existing:
        return {"seeded": False, "message": "选项已存在"}

    defaults = [
        "看电影", "一起做饭", "出去散步",
        "游戏之夜", "去买冰淇淋", "拍照",
        "公园野餐", "卡拉OK之夜",
        "在家吃浪漫晚餐", "一起做SPA",
        "做甜点", "看日落",
        "自制披萨之夜", "在客厅跳舞",
        "追剧马拉松", "骑自行车",
    ]
    count = 0
    for text in defaults:
        option = SpinnerOption(couple_id=couple_id, text=text)
        session.add(option)
        count += 1
    session.commit()
    return {"seeded": True, "count": count}


# --- Secret Letters (time-locked) ---

@router.get("/secret-letters-game", response_model=list[SecretLetterGameResponse])
def get_secret_letters(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letters = session.exec(
        select(SecretLetterGame).where(SecretLetterGame.couple_id == couple_id)
        .order_by(SecretLetterGame.created_at)
    ).all()
    results = []
    now = datetime.utcnow()
    for letter in letters:
        content = letter.content
        if not letter.opened_by and letter.author_id != user.id and now < letter.opens_at:
            content = None
        results.append(SecretLetterGameResponse(
            id=letter.id, couple_id=letter.couple_id, title=letter.title,
            content=content, author_id=letter.author_id,
            opens_at=letter.opens_at, opened_by=letter.opened_by,
            opened_at=letter.opened_at, created_at=letter.created_at,
        ))
    return results


@router.post("/secret-letters-game", response_model=SecretLetterGameResponse)
def create_secret_letter(data: SecretLetterGameCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = SecretLetterGame(couple_id=couple_id, created_by=user.id, **data.model_dump(), author_id=user.id)
    session.add(letter)
    session.commit()
    session.refresh(letter)
    return letter


@router.post("/secret-letters-game/{letter_id}/open", response_model=SecretLetterGameResponse)
def open_secret_letter(letter_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = session.get(SecretLetterGame, letter_id)
    if not letter or letter.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="信件未找到")
    now = datetime.utcnow()
    if now < letter.opens_at:
        raise HTTPException(status_code=400, detail="此信件还不能打开")
    if letter.opened_by:
        raise HTTPException(status_code=400, detail="此信件已被打开")
    letter.opened_by = user.id
    letter.opened_at = now
    session.add(letter)
    session.commit()
    session.refresh(letter)
    return letter


@router.delete("/secret-letters-game/{letter_id}")
def delete_secret_letter(letter_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = session.get(SecretLetterGame, letter_id)
    if not letter or letter.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="信件未找到")
    if letter.author_id != user.id:
        raise HTTPException(status_code=403, detail="只有作者可以删除此信件")
    session.delete(letter)
    session.commit()
    return {"ok": True}


# --- Love Reasons (Jar) ---

_100_REASONS = [
    "因为你的笑容照亮了我的一天",
    "因为在我最需要的时候你让我笑",
    "因为你会像世界不存在一样拥抱我",
    "因为你总是相信我",
    "因为你让我觉得自己是最特别的人",
    "因为你的声音在最糟糕的时刻让我平静",
    "因为你用心做饭",
    "因为在我生病时你照顾我",
    "因为没有音乐你也和我跳舞",
    "因为你给我意想不到的吻",
    "因为你倾听我而不评判我",
    "因为你激励我成为更好的人",
    "因为你让灰暗的日子有了色彩",
    "因为你的笑声是我最喜欢的声音",
    "因为你不用我说就牵起我的手",
    "因为你看我的眼神像我是世界上最美好的",
    "因为你总是说出恰到好处的话",
    "因为你在我的疯狂中支持我",
    "因为你让一切都值得",
    "因为你在我最不期待的时候发甜蜜的消息",
    "因为你关心我的幸福",
    "因为你是我最好的朋友",
    "因为你让我感到安全",
    "因为在我犯错时你原谅我",
    "因为你每天都教我新东西",
    "因为你对我有无限的耐心",
    "因为你会像庆祝自己的成就一样庆祝我的",
    "因为在我需要空间时你给我空间",
    "因为你总是记得小细节",
    "因为你按我喜欢的方式给我泡咖啡",
    "因为你让我觉得自己什么都行",
    "因为你的怀抱是我最喜欢的地方",
    "因为你总是对我诚实",
    "因为你在我最不期待的时候给我惊喜",
    "因为你笑我不好笑的笑话",
    "因为你在我的冒险中陪伴我",
    "因为你让我做真实的自己",
    "因为我们分享舒适的沉默",
    "因为你跟我说话时看着我的眼睛",
    "因为你的心很宽广",
    "因为不管在哪里你都让我有家的感觉",
    "因为你是我理想的人生伴侣",
    "因为你把你最宝贵的时间给了我",
    "因为我不在时你维护我",
    "因为你为我们两个勇敢",
    "因为你每天都激励我",
    "因为你的善良没有边界",
    "因为你让我想为你变得更好",
    "因为在你身边入睡是我最喜欢的时刻",
    "因为和你一起醒来是最好的开始",
    "因为你的气味让我安心",
    "因为你确切知道我需要什么",
    "因为你无缘无故地宠我",
    "因为你为我们的感情而战",
    "因为过了这么久你还是让我心动",
    "因为你聪明得不可思议",
    "因为你的创造力让我着迷",
    "因为你给我做惊喜餐",
    "因为即使跑调你也唱歌，我很喜欢",
    "因为你发只有我懂的梗",
    "因为我们有同样的梦想",
    "因为即使我没道理你也站我这边",
    "因为你是我的头号粉丝",
    "因为我背痒时你帮我挠",
    "因为你比任何人都更好地照顾我",
    "因为你是我在这个世界上最喜欢的人",
    "因为你让问题看起来很小",
    "因为你在我需要的时候说爱我",
    "因为你的决心激励我",
    "因为你连同我的缺点一起接受我",
    "因为我们一起创造了美好的回忆",
    "因为你让我相信真爱存在",
    "因为你是混乱中的平静",
    "因为你在我没注意时给我拍照",
    "因为你让我偷吃你的食物",
    "因为你在我冷时借我你的毛衣",
    "因为你发给我美丽的语音消息",
    "因为你为小事而激动",
    "因为你总是把我纳入你的计划",
    "因为即使你不同意你也尊重我的意见",
    "因为你每天都让我感到被爱",
    "因为你的忠诚坚不可摧",
    "因为你不会让我放弃梦想",
    "因为你给我最好的建议",
    "因为你的正能量是有感染力的",
    "因为你让我感到年轻和有活力",
    "因为你在我难过时陪我一起哭",
    "因为你在我开心时和我一起庆祝",
    "因为你是我的避风港",
    "因为你给我写情书",
    "因为你会亲我的额头",
    "因为在我累了时你抱我",
    "因为你把我当作你的优先事项",
    "因为你让每一天都成为冒险",
    "因为你爱我本来的样子，不改变我",
    "因为你让我觉得自己已经足够好",
    "因为我们建立了一段值得讲述的爱情",
    "因为我想和你共度余生",
    "因为你就是你，这就足够了",
    "因为你选择了我",
]


@router.get("/love-reasons", response_model=list[LoveReasonResponse])
def get_love_reasons(
    category: str = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    q = select(LoveReason).where(LoveReason.couple_id == couple_id)
    if category:
        q = q.where(LoveReason.category == category)
    reasons = session.exec(q.order_by(LoveReason.created_at)).all()
    return reasons


@router.get("/love-reasons/random", response_model=LoveReasonResponse)
def get_random_love_reason(
    category: str = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    q = select(LoveReason).where(LoveReason.couple_id == couple_id)
    if category:
        q = q.where(LoveReason.category == category)
    reasons = session.exec(q).all()
    if not reasons:
        raise HTTPException(status_code=404, detail="暂无爱的理由")
    return random.choice(reasons)


@router.post("/love-reasons", response_model=LoveReasonResponse)
def create_love_reason(data: LoveReasonCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    reason = LoveReason(couple_id=couple_id, **data.model_dump(), author_id=user.id)
    session.add(reason)
    session.commit()
    session.refresh(reason)
    return reason


@router.post("/love-reasons/seed-100")
def seed_100_reasons(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(
        select(LoveReason).where(
            LoveReason.couple_id == couple_id,
            LoveReason.category == "100reasons",
            LoveReason.is_preset == True,
        )
    ).first()
    if existing:
        return {"ok": True, "message": "already seeded"}
    for text in _100_REASONS:
        reason = LoveReason(
            couple_id=couple_id,
            author_id=user.id,
            text=text,
            category="100reasons",
            is_preset=True,
        )
        session.add(reason)
    session.commit()
    return {"ok": True, "message": "seeded"}


@router.delete("/love-reasons/{reason_id}")
def delete_love_reason(reason_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    reason = session.get(LoveReason, reason_id)
    if not reason or reason.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="理由未找到")
    if reason.is_preset:
        raise HTTPException(status_code=403, detail="无法删除预设理由")
    if reason.author_id != user.id:
        raise HTTPException(status_code=403, detail="只有作者可以删除此理由")
    session.delete(reason)
    session.commit()
    return {"ok": True}


# --- Countdowns ---

@router.get("/countdowns", response_model=list[EventCountdownResponse])
def get_countdowns(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    countdowns = session.exec(
        select(EventCountdown).where(EventCountdown.couple_id == couple_id)
        .order_by(EventCountdown.event_date)
    ).all()
    return countdowns


@router.post("/countdowns", response_model=EventCountdownResponse)
def create_countdown(data: EventCountdownCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    countdown = EventCountdown(couple_id=couple_id, created_by=user.id, **data.model_dump())
    session.add(countdown)
    session.commit()
    session.refresh(countdown)
    return countdown


@router.delete("/countdowns/{countdown_id}")
def delete_countdown(countdown_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    countdown = session.get(EventCountdown, countdown_id)
    if not countdown or countdown.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="倒计时未找到")
    session.delete(countdown)
    session.commit()
    return {"ok": True}


# --- Bingo ---

@router.get("/bingo", response_model=list[BingoCellResponse])
def get_bingo(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    cells = session.exec(
        select(BingoCell).where(BingoCell.couple_id == couple_id)
        .order_by(BingoCell.order)
    ).all()
    return cells


@router.post("/bingo", response_model=BingoCellResponse)
def create_bingo_cell(data: BingoCellCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    cell = BingoCell(couple_id=couple_id, created_by=user.id, **data.model_dump())
    session.add(cell)
    session.commit()
    session.refresh(cell)
    return cell


@router.post("/bingo/seed")
def seed_bingo(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(
        select(BingoCell).where(BingoCell.couple_id == couple_id)
    ).first()
    if existing:
        return {"seeded": False, "message": "宾果格已存在"}

    activities = [
        "在雨中接吻", "一起看日出", "一起做饭",
        "整晚相拥而眠", "在客厅跳舞", "来一次惊喜约会",
        "看星星", "互相写情书", "去野餐",
        "一起拍照", "一起唱歌", "一起运动",
        "床上早餐", "周末旅行", "电影马拉松",
        "烛光晚餐",
    ]
    count = 0
    for i, text in enumerate(activities):
        cell = BingoCell(couple_id=couple_id, text=text, order=i)
        session.add(cell)
        count += 1
    session.commit()
    return {"seeded": True, "count": count}


@router.post("/bingo/{cell_id}/toggle", response_model=BingoCellResponse)
def toggle_bingo_cell(cell_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    cell = session.get(BingoCell, cell_id)
    if not cell or cell.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="格子未找到")
    if cell.completed:
        cell.completed = False
        cell.completed_at = None
    else:
        cell.completed = True
        cell.completed_at = datetime.utcnow()
    session.add(cell)
    session.commit()
    session.refresh(cell)
    return cell


@router.delete("/bingo/{cell_id}")
def delete_bingo_cell(cell_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    cell = session.get(BingoCell, cell_id)
    if not cell or cell.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="格子未找到")
    session.delete(cell)
    session.commit()
    return {"ok": True}


# --- Who's Most Likely ---

@router.get("/whos-most-likely", response_model=list[WhosMostLikelyResponse])
def get_whos_most_likely(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    questions = session.exec(
        select(WhosMostLikely).where(WhosMostLikely.couple_id == couple_id)
        .order_by(WhosMostLikely.created_at)
    ).all()
    results = []
    for q in questions:
        votes = session.exec(
            select(WhosMostLikelyVote).where(WhosMostLikelyVote.question_id == q.id)
        ).all()
        vote_responses = [
            WhosMostLikelyVoteResponse(
                id=v.id, question_id=v.question_id,
                user_id=v.user_id, voted_for=v.voted_for,
                created_at=v.created_at,
            ) for v in votes
        ]
        results.append(WhosMostLikelyResponse(
            id=q.id, couple_id=q.couple_id, question=q.question,
            is_preset=q.is_preset, created_by=q.created_by,
            votes=vote_responses, created_at=q.created_at,
        ))
    return results


@router.post("/whos-most-likely", response_model=WhosMostLikelyResponse)
def create_whos_most_likely(data: WhosMostLikelyCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以添加问题")
    question = WhosMostLikely(couple_id=couple_id, question=data.question, is_preset=False, created_by=user.id)
    session.add(question)
    session.commit()
    session.refresh(question)
    return WhosMostLikelyResponse(
        id=question.id, couple_id=question.couple_id, question=question.question,
        is_preset=question.is_preset, created_by=question.created_by,
        votes=[], created_at=question.created_at,
    )


@router.post("/whos-most-likely/seed")
def seed_whos_most_likely(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    # Get all existing preset questions to avoid duplicates
    existing_presets = session.exec(
        select(WhosMostLikely).where(WhosMostLikely.couple_id == couple_id, WhosMostLikely.is_preset == True)
    ).all()
    existing_texts = {q.question for q in existing_presets}

    questions = [
        # 经典
        "谁更可能看电影时哭？",
        "谁更可能先睡着？",
        "谁更可能忘记重要日期？",
        "谁更可能先说'我爱你'？",
        "谁更可能做饭更好吃？",
        "谁更可能花更多钱？",
        "谁更可能为爱做疯狂的事？",
        "谁更可能更爱吃醋？",
        "谁更可能策划惊喜？",
        "谁更可能发更多消息？",
        # 浪漫
        "谁更可能写情书？",
        "谁更可能在公共场合索吻？",
        "谁更可能策划完美约会？",
        "谁更可能献歌一首？",
        "谁更可能做手工礼物？",
        "谁更可能不自觉地说出肉麻的话？",
        "谁更可能先求婚？",
        "谁更可能记住初吻？",
        "谁更可能在婚礼上哭泣？",
        "谁更可能写出更长的婚礼誓言？",
        # 性格
        "谁更可能开车迷路？",
        "谁更容易生气？",
        "谁更可能先道歉？",
        "谁更可能更固执？",
        "谁更可能讲冷笑话？",
        "谁更可能被自己的笑话逗笑？",
        "谁更可能更戏剧化？",
        "谁更可能夸大其词？",
        "谁更可能更粗心大意？",
        "谁更可能说梦话？",
        "谁可能打呼噜更响？",
        "谁更可能更挑食？",
        "谁更可能抱怨太冷？",
        "谁更可能抱怨太热？",
        "谁更可能每小时都说'我饿了'？",
        # 日常生活
        "谁更可能乱扔衣服？",
        "谁更可能洗碗？",
        "谁更可能弄丢钥匙？",
        "谁更可能出门准备更久？",
        "谁更可能选Netflix看什么？",
        "谁更可能半夜抢被子？",
        "谁更可能把热水用完？",
        "谁更可能点外卖？",
        "谁更可能手机没电？",
        "谁更可能刷手机到深夜？",
        "谁更可能设了闹钟却不起床？",
        "谁更可能忘记倒垃圾？",
        "谁更可能做更好的早餐？",
        "谁更可能不带清单去超市？",
        "谁更可能买不需要的东西？",
        # 社交与娱乐
        "谁更可能是派对的灵魂人物？",
        "谁更可能和陌生人交朋友？",
        "谁更可能跳舞更好？",
        "谁更可能在车里唱歌更大声？",
        "谁更可能清醒时唱K？",
        "谁更可能赢桌游？",
        "谁更可能玩游戏时作弊？",
        "谁更可能拍更多照片？",
        "谁更可能在社交媒体上发更多？",
        "谁更可能在社交媒体上偷偷关注对方？",
        "谁更可能更好胜？",
        "谁更可能笑到哭？",
        "谁更可能看猫咪视频？",
        "谁更可能更容易被吓到？",
        "谁更可能想看恐怖片？",
        # 冒险与未来
        "谁更可能提议说走就走的旅行？",
        "谁更可能想跳伞？",
        "谁更可能学另一门语言？",
        "谁更可能不打招呼就领养宠物？",
        "谁更可能想搬到另一个国家？",
        "谁更可能存更多钱？",
        "谁更可能冲动消费？",
        "谁更可能每个月开始一个新爱好？",
        "谁更可能更会养植物？",
        "谁更可能不看说明书就组装家具？",
        # 情感
        "谁更可能需要更多拥抱？",
        "谁更可能更想念对方？",
        "谁更可能每天发第一条消息？",
        "谁更可能更关心对方？",
        "谁更可能察觉到不对劲？",
        "谁更可能制造更尴尬的沉默？",
        "谁更可能用食物道歉？",
        "谁更可能听歌听哭？",
        "谁更可能保留一切回忆？",
        "谁更可能闻对方的衣服？",
        # 有趣与随机
        "谁更可能在荒岛上生存？",
        "谁更可能出名？",
        "谁更可能上真人秀？",
        "谁更可能忘记纪念日？",
        "谁更可能谎报年龄？",
        "谁更可能在约会时摔倒？",
        "谁更可能发消息发错群？",
        "谁更可能在岳父岳母面前说错话？",
        "谁更可能万圣节装扮更好？",
        "谁更可能拍出爆款抖音？",
    ]
    count = 0
    for text in questions:
        if text not in existing_texts:
            q = WhosMostLikely(couple_id=couple_id, question=text, is_preset=True, created_by=user.id)
            session.add(q)
            count += 1
    session.commit()
    return {"seeded": True, "count": count}


@router.post("/whos-most-likely/{question_id}/vote", response_model=WhosMostLikelyVoteResponse)
def vote_whos_most_likely(question_id: int, data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    question = session.get(WhosMostLikely, question_id)
    if not question or question.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="问题未找到")
    voted_for = data.get("voted_for")
    if not voted_for:
        raise HTTPException(status_code=400, detail="你必须指定投票对象")

    existing_vote = session.exec(
        select(WhosMostLikelyVote).where(
            WhosMostLikelyVote.question_id == question_id,
            WhosMostLikelyVote.user_id == user.id,
        )
    ).first()

    if existing_vote:
        existing_vote.voted_for = voted_for
        session.add(existing_vote)
        session.commit()
        session.refresh(existing_vote)
        return WhosMostLikelyVoteResponse(
            id=existing_vote.id, question_id=existing_vote.question_id,
            user_id=existing_vote.user_id, voted_for=existing_vote.voted_for,
            created_at=existing_vote.created_at,
        )
    else:
        vote = WhosMostLikelyVote(question_id=question_id, user_id=user.id, voted_for=voted_for)
        session.add(vote)
        session.commit()
        session.refresh(vote)
        return WhosMostLikelyVoteResponse(
            id=vote.id, question_id=vote.question_id,
            user_id=vote.user_id, voted_for=vote.voted_for,
            created_at=vote.created_at,
        )


@router.delete("/whos-most-likely/{question_id}")
def delete_whos_most_likely(question_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if user.role != "partner_1":
        raise HTTPException(status_code=403, detail="只有创建者可以删除问题")
    question = session.get(WhosMostLikely, question_id)
    if not question or question.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="问题未找到")
    if question.is_preset:
        raise HTTPException(status_code=400, detail="无法删除预设问题")
    # Delete associated votes first
    votes = session.exec(
        select(WhosMostLikelyVote).where(WhosMostLikelyVote.question_id == question_id)
    ).all()
    for v in votes:
        session.delete(v)
    session.delete(question)
    session.commit()
    return {"ok": True}


# ─── Time Capsules ───

@router.get("/capsules", response_model=list[TimeCapsuleResponse])
def get_capsules(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    capsules = session.exec(
        select(TimeCapsule).where(TimeCapsule.couple_id == couple_id)
        .order_by(TimeCapsule.opens_at)
    ).all()
    results = []
    now = datetime.utcnow()
    for c in capsules:
        data = TimeCapsuleResponse(
            id=c.id,
            couple_id=c.couple_id,
            author_id=c.author_id,
            title=c.title,
            message=c.message if c.opened or c.opens_at <= now else None,
            photo_url=c.photo_url if c.opened or c.opens_at <= now else None,
            opens_at=c.opens_at,
            opened=c.opened,
            opened_at=c.opened_at,
            created_at=c.created_at,
        )
        results.append(data)
    return results


@router.post("/capsules", response_model=TimeCapsuleResponse)
def create_capsule(body: TimeCapsuleCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    opens_at_naive = body.opens_at.replace(tzinfo=None) if body.opens_at.tzinfo else body.opens_at
    if opens_at_naive <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="开启日期必须是未来的日期")
    capsule = TimeCapsule(
        couple_id=couple_id,
        author_id=user.id,
        title=body.title,
        message=body.message,
        opens_at=body.opens_at,
    )
    session.add(capsule)
    session.commit()
    session.refresh(capsule)
    # Award XP
    award_xp(couple_id, user.id, "capsule_created", 15, session)
    return TimeCapsuleResponse(
        id=capsule.id, couple_id=capsule.couple_id, author_id=capsule.author_id,
        title=capsule.title, message=None, photo_url=None,
        opens_at=capsule.opens_at, opened=False, opened_at=None, created_at=capsule.created_at,
    )


@router.post("/capsules/{capsule_id}/open", response_model=TimeCapsuleResponse)
def open_capsule(capsule_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    capsule = session.get(TimeCapsule, capsule_id)
    if not capsule or capsule.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="时光胶囊未找到")
    if capsule.opened:
        raise HTTPException(status_code=400, detail="已被打开")
    now = datetime.utcnow()
    if capsule.opens_at > now:
        raise HTTPException(status_code=400, detail="还没到打开这时光胶囊的时间")
    capsule.opened = True
    capsule.opened_at = now
    session.add(capsule)
    session.commit()
    session.refresh(capsule)
    award_xp(couple_id, user.id, "capsule_opened", 10, session)
    return TimeCapsuleResponse(
        id=capsule.id, couple_id=capsule.couple_id, author_id=capsule.author_id,
        title=capsule.title, message=capsule.message, photo_url=capsule.photo_url,
        opens_at=capsule.opens_at, opened=True, opened_at=capsule.opened_at,
        created_at=capsule.created_at,
    )


@router.post("/capsules/{capsule_id}/upload-photo")
def upload_capsule_photo(capsule_id: int, file: UploadFile = File(...), user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    capsule = session.get(TimeCapsule, capsule_id)
    if not capsule or capsule.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="时光胶囊未找到")
    if capsule.author_id != user.id:
        raise HTTPException(status_code=403, detail="只有作者可以上传照片")
    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"capsule_{capsule_id}_{file.filename}"
    filepath = UPLOADS_IMAGES_DIR / filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    capsule.photo_url = f"/uploads/images/{filename}"
    session.add(capsule)
    session.commit()
    return {"photo_url": capsule.photo_url}


@router.delete("/capsules/{capsule_id}")
def delete_capsule(capsule_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    capsule = session.get(TimeCapsule, capsule_id)
    if not capsule or capsule.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="时光胶囊未找到")
    if capsule.author_id != user.id:
        raise HTTPException(status_code=403, detail="只有作者可以删除")
    session.delete(capsule)
    session.commit()
    return {"ok": True}


# ─── XP / Levels ───

XP_THRESHOLDS = [0, 100, 250, 500, 850, 1300, 1850, 2500, 3300, 4200, 5200, 6400, 7800, 9400, 11200]

def _get_level_info(total_xp: int):
    level = 1
    for i, threshold in enumerate(XP_THRESHOLDS):
        if total_xp >= threshold:
            level = i + 1
        else:
            break
    xp_current = XP_THRESHOLDS[level - 1] if level - 1 < len(XP_THRESHOLDS) else XP_THRESHOLDS[-1]
    xp_next = XP_THRESHOLDS[level] if level < len(XP_THRESHOLDS) else XP_THRESHOLDS[-1] + 1500
    progress = ((total_xp - xp_current) / (xp_next - xp_current) * 100) if xp_next > xp_current else 100.0
    return level, xp_current, xp_next, round(progress, 1)


def award_xp(couple_id: int, user_id: int, action: str, amount: int, session: Session):
    xp_record = session.exec(
        select(CoupleXP).where(CoupleXP.couple_id == couple_id)
    ).first()
    if not xp_record:
        xp_record = CoupleXP(couple_id=couple_id)
        session.add(xp_record)
        session.flush()
    xp_record.total_xp += amount
    xp_record.level, _, _, _ = _get_level_info(xp_record.total_xp)
    xp_record.updated_at = datetime.utcnow()
    session.add(xp_record)
    log = XPLog(couple_id=couple_id, user_id=user_id, action=action, xp_amount=amount)
    session.add(log)
    session.commit()


@router.get("/xp", response_model=CoupleXPResponse)
def get_xp(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    xp_record = session.exec(
        select(CoupleXP).where(CoupleXP.couple_id == couple_id)
    ).first()
    if not xp_record:
        xp_record = CoupleXP(couple_id=couple_id)
        session.add(xp_record)
        session.commit()
        session.refresh(xp_record)
    level, xp_current, xp_next, progress = _get_level_info(xp_record.total_xp)
    return CoupleXPResponse(
        total_xp=xp_record.total_xp,
        level=level,
        xp_for_current_level=xp_current,
        xp_for_next_level=xp_next,
        progress_percent=progress,
    )


@router.get("/xp/log", response_model=list[XPLogResponse])
def get_xp_log(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    logs = session.exec(
        select(XPLog).where(XPLog.couple_id == couple_id)
        .order_by(XPLog.created_at.desc())  # type: ignore
        .limit(50)
    ).all()
    return logs


@router.post("/xp/award")
def award_xp_manual(action: str, amount: int = 10, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Award XP for various actions. Called internally or manually."""
    couple_id = require_couple(user)
    award_xp(couple_id, user.id, action, amount, session)
    return {"ok": True}


# ─── Open When Letters ───

OPEN_WHEN_CATEGORIES = [
    "happy", "sad", "stressed", "angry", "missing_you", "grateful",
    "bored", "scared", "lonely", "proud", "need_motivation", "anniversary",
]

@router.get("/open-when", response_model=list[OpenWhenLetterResponse])
def get_open_when_letters(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letters = session.exec(
        select(OpenWhenLetter).where(OpenWhenLetter.couple_id == couple_id)
        .order_by(OpenWhenLetter.created_at)
    ).all()
    results = []
    for letter in letters:
        content = letter.content if (letter.opened_by or letter.author_id == user.id) else None
        results.append(OpenWhenLetterResponse(
            id=letter.id, couple_id=letter.couple_id, author_id=letter.author_id,
            category=letter.category, content=content,
            opened_by=letter.opened_by, opened_at=letter.opened_at,
            created_at=letter.created_at,
        ))
    return results


@router.post("/open-when", response_model=OpenWhenLetterResponse)
def create_open_when_letter(data: OpenWhenLetterCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    if data.category not in OPEN_WHEN_CATEGORIES:
        raise HTTPException(status_code=400, detail="无效分类")
    letter = OpenWhenLetter(
        couple_id=couple_id,
        author_id=user.id,
        category=data.category,
        content=data.content,
    )
    session.add(letter)
    session.commit()
    session.refresh(letter)
    award_xp(couple_id, user.id, "open_when_created", 10, session)
    return OpenWhenLetterResponse(
        id=letter.id, couple_id=letter.couple_id, author_id=letter.author_id,
        category=letter.category, content=letter.content,
        opened_by=None, opened_at=None, created_at=letter.created_at,
    )


@router.post("/open-when/{letter_id}/open", response_model=OpenWhenLetterResponse)
def open_when_letter(letter_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = session.get(OpenWhenLetter, letter_id)
    if not letter or letter.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="信件未找到")
    if letter.opened_by:
        raise HTTPException(status_code=400, detail="此信件已被打开")
    if letter.author_id == user.id:
        raise HTTPException(status_code=400, detail="你不能打开自己的信件")
    letter.opened_by = user.id
    letter.opened_at = datetime.utcnow()
    session.add(letter)
    session.commit()
    session.refresh(letter)
    award_xp(couple_id, user.id, "open_when_opened", 10, session)
    return letter


@router.delete("/open-when/{letter_id}")
def delete_open_when_letter(letter_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    letter = session.get(OpenWhenLetter, letter_id)
    if not letter or letter.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="信件未找到")
    if letter.author_id != user.id:
        raise HTTPException(status_code=403, detail="只有作者可以删除此信件")
    session.delete(letter)
    session.commit()
    return {"ok": True}


# --- Movie / Series Picker ---

_MOVIE_SEED = [
    # ── 动作 ──
    ("John Wick", 2014, "action", "movie", "🔫"),
    ("Mad Max: Fury Road", 2015, "action", "movie", "🏎️"),
    ("Gladiator", 2000, "action", "movie", "⚔️"),
    ("The Dark Knight", 2008, "action", "movie", "🦇"),
    ("Kill Bill: Vol. 1", 2003, "action", "movie", "🗡️"),
    ("Mission: Impossible – Fallout", 2018, "action", "movie", "🕵️"),
    ("Top Gun: Maverick", 2022, "action", "movie", "✈️"),
    ("Die Hard", 1988, "action", "movie", "💥"),
    ("The Matrix", 1999, "action", "movie", "🕶️"),
    ("Avengers: Endgame", 2019, "action", "movie", "🦸"),
    ("Spider-Man: No Way Home", 2021, "action", "movie", "🕷️"),
    ("Fast & Furious 7", 2015, "action", "movie", "🚗"),
    ("Black Panther", 2018, "action", "movie", "🐆"),
    ("Extraction", 2020, "action", "movie", "💣"),
    ("300", 2006, "action", "movie", "🛡️"),
    # ── 喜剧 ──
    ("Superbad", 2007, "comedy", "movie", "😂"),
    ("The Hangover", 2009, "comedy", "movie", "🍻"),
    ("Bridesmaids", 2011, "comedy", "movie", "👰"),
    ("Mean Girls", 2004, "comedy", "movie", "💅"),
    ("Step Brothers", 2008, "comedy", "movie", "🤪"),
    ("21 Jump Street", 2012, "comedy", "movie", "🚔"),
    ("Knives Out", 2019, "comedy", "movie", "🔪"),
    ("The Grand Budapest Hotel", 2014, "comedy", "movie", "🏨"),
    ("Juno", 2007, "comedy", "movie", "🎸"),
    ("Game Night", 2018, "comedy", "movie", "🎲"),
    ("White Chicks", 2004, "comedy", "movie", "👱"),
    ("Scary Movie", 2000, "comedy", "movie", "😱"),
    ("Click", 2006, "comedy", "movie", "📺"),
    ("Liar Liar", 1997, "comedy", "movie", "🤥"),
    ("Mrs. Doubtfire", 1993, "comedy", "movie", "👵"),
    # ── 爱情 ──
    ("The Notebook", 2004, "romance", "movie", "💌"),
    ("Pride & Prejudice", 2005, "romance", "movie", "📖"),
    ("Titanic", 1997, "romance", "movie", "🚢"),
    ("La La Land", 2016, "romance", "movie", "🌙"),
    ("A Walk to Remember", 2002, "romance", "movie", "🌹"),
    ("10 Things I Hate About You", 1999, "romance", "movie", "💋"),
    ("To All the Boys I've Loved Before", 2018, "romance", "movie", "💕"),
    ("Crazy Rich Asians", 2018, "romance", "movie", "💎"),
    ("The Fault in Our Stars", 2014, "romance", "movie", "⭐"),
    ("Me Before You", 2016, "romance", "movie", "🧣"),
    ("About Time", 2013, "romance", "movie", "⏰"),
    ("Notting Hill", 1999, "romance", "movie", "🏡"),
    ("500 Days of Summer", 2009, "romance", "movie", "🌻"),
    ("Love Actually", 2003, "romance", "movie", "❤️"),
    ("P.S. I Love You", 2007, "romance", "movie", "✉️"),
    ("After", 2019, "romance", "movie", "🔥"),
    ("A Través de Mi Ventana", 2022, "romance", "movie", "🪟"),
    ("Purple Hearts", 2022, "romance", "movie", "💜"),
    # ── 恐怖 ──
    ("Get Out", 2017, "horror", "movie", "🧠"),
    ("A Quiet Place", 2018, "horror", "movie", "🤫"),
    ("Hereditary", 2018, "horror", "movie", "👁️"),
    ("The Conjuring", 2013, "horror", "movie", "👻"),
    ("It", 2017, "horror", "movie", "🎈"),
    ("Midsommar", 2019, "horror", "movie", "🌸"),
    ("Scream", 1996, "horror", "movie", "📞"),
    ("The Shining", 1980, "horror", "movie", "🪓"),
    ("Paranormal Activity", 2007, "horror", "movie", "📹"),
    ("Insidious", 2010, "horror", "movie", "🚪"),
    ("Annabelle", 2014, "horror", "movie", "🧸"),
    ("The Ring", 2002, "horror", "movie", "📺"),
    ("Smile", 2022, "horror", "movie", "😊"),
    ("Nope", 2022, "horror", "movie", "🛸"),
    ("Talk to Me", 2023, "horror", "movie", "🤚"),
    # ── 剧情 ──
    ("The Shawshank Redemption", 1994, "drama", "movie", "🔒"),
    ("Forrest Gump", 1994, "drama", "movie", "🏃"),
    ("The Pursuit of Happyness", 2006, "drama", "movie", "🧳"),
    ("Whiplash", 2014, "drama", "movie", "🥁"),
    ("Good Will Hunting", 1997, "drama", "movie", "📐"),
    ("A Beautiful Mind", 2001, "drama", "movie", "🧮"),
    ("The Green Mile", 1999, "drama", "movie", "💡"),
    ("Bohemian Rhapsody", 2018, "drama", "movie", "🎤"),
    ("12 Years a Slave", 2013, "drama", "movie", "⛓️"),
    ("Schindler's List", 1993, "drama", "movie", "📋"),
    ("Fight Club", 1999, "drama", "movie", "🧼"),
    ("Parasite", 2019, "drama", "movie", "🏠"),
    ("Oppenheimer", 2023, "drama", "movie", "💣"),
    ("Everything Everywhere All at Once", 2022, "drama", "movie", "🥯"),
    ("The Father", 2020, "drama", "movie", "🧓"),
    # ── 科幻 ──
    ("Interstellar", 2014, "scifi", "movie", "🌌"),
    ("Inception", 2010, "scifi", "movie", "🌀"),
    ("Blade Runner 2049", 2017, "scifi", "movie", "🤖"),
    ("Arrival", 2016, "scifi", "movie", "🛸"),
    ("Dune", 2021, "scifi", "movie", "🏜️"),
    ("The Martian", 2015, "scifi", "movie", "🚀"),
    ("Ex Machina", 2014, "scifi", "movie", "🦾"),
    ("Gravity", 2013, "scifi", "movie", "🌍"),
    ("Tenet", 2020, "scifi", "movie", "⏳"),
    ("Avatar", 2009, "scifi", "movie", "🌿"),
    ("Star Wars: A New Hope", 1977, "scifi", "movie", "⭐"),
    ("E.T.", 1982, "scifi", "movie", "👽"),
    ("Back to the Future", 1985, "scifi", "movie", "⚡"),
    ("District 9", 2009, "scifi", "movie", "🦐"),
    ("Alien", 1979, "scifi", "movie", "🥚"),
    # ── 动画 ──
    ("Spider-Man: Into the Spider-Verse", 2018, "animation", "movie", "🕸️"),
    ("Coco", 2017, "animation", "movie", "🎸"),
    ("Soul", 2020, "animation", "movie", "🎹"),
    ("Up", 2009, "animation", "movie", "🎈"),
    ("Inside Out", 2015, "animation", "movie", "😊"),
    ("Ratatouille", 2007, "animation", "movie", "🐀"),
    ("Shrek", 2001, "animation", "movie", "🧅"),
    ("Howl's Moving Castle", 2004, "animation", "movie", "🏰"),
    ("Spirited Away", 2001, "animation", "movie", "🐉"),
    ("Your Name", 2016, "animation", "movie", "🌠"),
    ("Encanto", 2021, "animation", "movie", "🦋"),
    ("Toy Story", 1995, "animation", "movie", "🤠"),
    ("Frozen", 2013, "animation", "movie", "❄️"),
    ("Moana", 2016, "animation", "movie", "🌊"),
    ("The Lion King", 1994, "animation", "movie", "🦁"),
    # ── Thriller ──
    ("Gone Girl", 2014, "thriller", "movie", "📔"),
    ("Se7en", 1995, "thriller", "movie", "📦"),
    ("Prisoners", 2013, "thriller", "movie", "🔍"),
    ("Zodiac", 2007, "thriller", "movie", "♈"),
    ("Shutter Island", 2010, "thriller", "movie", "🏝️"),
    ("Silence of the Lambs", 1991, "thriller", "movie", "🦋"),
    ("No Country for Old Men", 2007, "thriller", "movie", "🪙"),
    ("Nightcrawler", 2014, "thriller", "movie", "📸"),
    ("The Girl with the Dragon Tattoo", 2011, "thriller", "movie", "🐲"),
    ("Uncut Gems", 2019, "thriller", "movie", "💎"),
    ("Old Boy", 2003, "thriller", "movie", "🔨"),
    ("The Invisible Guest", 2016, "thriller", "movie", "🕵️"),
    ("Don't Breathe", 2016, "thriller", "movie", "🏚️"),
    ("Split", 2016, "thriller", "movie", "🪞"),
    ("The Menu", 2022, "thriller", "movie", "🍽️"),
    # ── Series ──
    ("Stranger Things", 2016, "series", "series", "🔦"),
    ("Breaking Bad", 2008, "series", "series", "🧪"),
    ("Game of Thrones", 2011, "series", "series", "👑"),
    ("The Office", 2005, "series", "series", "🏢"),
    ("Friends", 1994, "series", "series", "☕"),
    ("Money Heist", 2017, "series", "series", "🎭"),
    ("Dark", 2017, "series", "series", "⏳"),
    ("The Crown", 2016, "series", "series", "👸"),
    ("Squid Game", 2021, "series", "series", "🦑"),
    ("Wednesday", 2022, "series", "series", "🖤"),
    ("The Witcher", 2019, "series", "series", "🐺"),
    ("Euphoria", 2019, "series", "series", "🌈"),
    ("Bridgerton", 2020, "series", "series", "💃"),
    ("Arcane", 2021, "series", "series", "⚙️"),
    ("The Mandalorian", 2019, "series", "series", "🪖"),
    ("Peaky Blinders", 2013, "series", "series", "🎩"),
    ("Ozark", 2017, "series", "series", "💵"),
    ("Black Mirror", 2011, "series", "series", "📱"),
    ("The Bear", 2022, "series", "series", "🐻"),
    ("Succession", 2018, "series", "series", "🏢"),
    ("You", 2018, "series", "series", "🧢"),
    ("Elite", 2018, "series", "series", "🏫"),
    ("Lupin", 2021, "series", "series", "🎩"),
    ("Narcos", 2015, "series", "series", "🌿"),
    ("The Last of Us", 2023, "series", "series", "🍄"),
    ("Ted Lasso", 2020, "series", "series", "⚽"),
    ("Severance", 2022, "series", "series", "🧠"),
    ("Beef", 2023, "series", "series", "🚗"),
    ("The Vampire Diaries", 2009, "series", "series", "🧛"),
    ("Grey's Anatomy", 2005, "series", "series", "🏥"),
    ("Suits", 2011, "series", "series", "👔"),
    ("How I Met Your Mother", 2005, "series", "series", "☂️"),
    ("La Casa de Papel", 2017, "series", "series", "💰"),
    ("Vis a Vis", 2015, "series", "series", "🔒"),
    ("Outer Banks", 2020, "series", "series", "🏖️"),
    ("Ginny & Georgia", 2021, "series", "series", "🏡"),
    ("Heartstopper", 2022, "series", "series", "🍂"),
    ("Never Have I Ever", 2020, "series", "series", "📚"),
    ("All of Us Are Dead", 2022, "series", "series", "🧟"),
    ("Alice in Borderland", 2020, "series", "series", "🃏"),
]


@router.get("/movies", response_model=list[MoviePickResponse])
def get_movies(
    category: str = None,
    media_type: str = None,
    watched: bool = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    q = select(MoviePick).where(MoviePick.couple_id == couple_id)
    if category:
        q = q.where(MoviePick.category == category)
    if media_type:
        q = q.where(MoviePick.media_type == media_type)
    if watched is not None:
        q = q.where(MoviePick.watched == watched)
    return session.exec(q.order_by(MoviePick.created_at)).all()


@router.post("/movies/seed")
def seed_movies(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(
        select(MoviePick).where(MoviePick.couple_id == couple_id, MoviePick.is_preset == True)
    ).first()
    if existing:
        return {"ok": True, "message": "already seeded"}
    for title, year, cat, mtype, emoji in _MOVIE_SEED:
        m = MoviePick(
            couple_id=couple_id, title=title, year=year,
            category=cat, media_type=mtype, poster_emoji=emoji,
            is_preset=True, added_by=user.id,
        )
        session.add(m)
    session.commit()
    return {"ok": True, "message": "seeded", "count": len(_MOVIE_SEED)}


@router.get("/movies/random", response_model=MoviePickResponse)
def get_random_movie(
    category: str = None,
    media_type: str = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    q = select(MoviePick).where(MoviePick.couple_id == couple_id, MoviePick.watched == False)
    if category:
        q = q.where(MoviePick.category == category)
    if media_type:
        q = q.where(MoviePick.media_type == media_type)
    movies = session.exec(q).all()
    if not movies:
        raise HTTPException(status_code=404, detail="没有可用的电影")
    return random.choice(movies)


@router.post("/movies", response_model=MoviePickResponse)
def create_movie(data: MoviePickCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    movie = MoviePick(couple_id=couple_id, added_by=user.id, **data.model_dump())
    session.add(movie)
    session.commit()
    session.refresh(movie)
    return movie


@router.post("/movies/{movie_id}/watch")
def mark_watched(movie_id: int, rating: int = None, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    movie = session.get(MoviePick, movie_id)
    if not movie or movie.couple_id != couple_id:
        raise HTTPException(status_code=404)
    movie.watched = True
    movie.watched_at = datetime.utcnow()
    if rating is not None:
        movie.rating = max(1, min(5, rating))
    session.add(movie)
    session.commit()
    session.refresh(movie)
    return movie


@router.post("/movies/{movie_id}/unwatch")
def unmark_watched(movie_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    movie = session.get(MoviePick, movie_id)
    if not movie or movie.couple_id != couple_id:
        raise HTTPException(status_code=404)
    movie.watched = False
    movie.watched_at = None
    movie.rating = None
    session.add(movie)
    session.commit()
    return movie


@router.delete("/movies/{movie_id}")
def delete_movie(movie_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    movie = session.get(MoviePick, movie_id)
    if not movie or movie.couple_id != couple_id:
        raise HTTPException(status_code=404)
    if movie.is_preset:
        raise HTTPException(status_code=403, detail="无法删除预设电影")
    session.delete(movie)
    session.commit()
    return {"ok": True}


# ══════════════════════════════════════════════════════════════
# SONG PICKER
# ══════════════════════════════════════════════════════════════

# (title, artist, year, genre, mood)
_SONG_SEED = [
    # ── Pop ──
    ("Blinding Lights", "The Weeknd", 2020, "pop", "energetic"),
    ("Shape of You", "Ed Sheeran", 2017, "pop", "happy"),
    ("Levitating", "Dua Lipa", 2020, "pop", "energetic"),
    ("Stay", "The Kid LAROI & Justin Bieber", 2021, "pop", "happy"),
    ("Watermelon Sugar", "Harry Styles", 2020, "pop", "happy"),
    ("drivers license", "Olivia Rodrigo", 2021, "pop", "sad"),
    ("As It Was", "Harry Styles", 2022, "pop", "nostalgic"),
    ("Anti-Hero", "Taylor Swift", 2022, "pop", "chill"),
    ("Flowers", "Miley Cyrus", 2023, "pop", "energetic"),
    ("bad guy", "Billie Eilish", 2019, "pop", "energetic"),
    ("Cruel Summer", "Taylor Swift", 2019, "pop", "energetic"),
    ("Espresso", "Sabrina Carpenter", 2024, "pop", "happy"),
    ("vampire", "Olivia Rodrigo", 2023, "pop", "energetic"),
    ("Dance The Night", "Dua Lipa", 2023, "pop", "energetic"),
    ("Lover", "Taylor Swift", 2019, "pop", "romantic"),
    # ── Rock ──
    ("Bohemian Rhapsody", "Queen", 1975, "rock", "energetic"),
    ("Stairway to Heaven", "Led Zeppelin", 1971, "rock", "chill"),
    ("Hotel California", "Eagles", 1977, "rock", "chill"),
    ("Smells Like Teen Spirit", "Nirvana", 1991, "rock", "energetic"),
    ("Under the Bridge", "Red Hot Chili Peppers", 1992, "rock", "nostalgic"),
    ("Creep", "Radiohead", 1993, "rock", "sad"),
    ("Wonderwall", "Oasis", 1995, "rock", "nostalgic"),
    ("In the End", "Linkin Park", 2001, "rock", "energetic"),
    ("Mr. Brightside", "The Killers", 2004, "rock", "energetic"),
    ("Use Somebody", "Kings of Leon", 2008, "rock", "romantic"),
    ("The Scientist", "Coldplay", 2002, "rock", "sad"),
    ("Fix You", "Coldplay", 2005, "rock", "sad"),
    ("Do I Wanna Know?", "Arctic Monkeys", 2013, "rock", "chill"),
    ("Yellow", "Coldplay", 2000, "rock", "romantic"),
    ("Iris", "Goo Goo Dolls", 1998, "rock", "romantic"),
    # ── 节奏布鲁斯 / 灵魂乐 ──
    ("Earned It", "The Weeknd", 2015, "rnb", "romantic"),
    ("All of Me", "John Legend", 2013, "rnb", "romantic"),
    ("Thinking Out Loud", "Ed Sheeran", 2014, "rnb", "romantic"),
    ("Say So", "Doja Cat", 2020, "rnb", "happy"),
    ("Kiss Me More", "Doja Cat ft. SZA", 2021, "rnb", "happy"),
    ("Snooze", "SZA", 2022, "rnb", "chill"),
    ("Kill Bill", "SZA", 2022, "rnb", "energetic"),
    ("Best Part", "Daniel Caesar ft. H.E.R.", 2017, "rnb", "romantic"),
    ("Adorn", "Miguel", 2012, "rnb", "romantic"),
    ("Redbone", "Childish Gambino", 2016, "rnb", "chill"),
    ("Crazy in Love", "Beyonce", 2003, "rnb", "energetic"),
    ("No One", "Alicia Keys", 2007, "rnb", "romantic"),
    ("We Found Love", "Rihanna", 2011, "rnb", "energetic"),
    ("Drunk in Love", "Beyonce", 2013, "rnb", "romantic"),
    ("Motivation", "Normani", 2019, "rnb", "energetic"),
    # ── 雷鬼动 / 拉丁 ──
    ("Titi Me Pregunto", "Bad Bunny", 2022, "reggaeton", "energetic"),
    ("Dakiti", "Bad Bunny & Jhay Cortez", 2020, "reggaeton", "energetic"),
    ("Pepas", "Farruko", 2021, "reggaeton", "energetic"),
    ("Despacito", "Luis Fonsi ft. Daddy Yankee", 2017, "reggaeton", "happy"),
    ("La Noche de Anoche", "Bad Bunny & Rosalia", 2021, "reggaeton", "romantic"),
    ("Hawai", "Maluma", 2020, "reggaeton", "sad"),
    ("Beso", "Rosalia & Rauw Alejandro", 2023, "reggaeton", "romantic"),
    ("Me Porto Bonito", "Bad Bunny & Chencho Corleone", 2022, "reggaeton", "happy"),
    ("Callaita", "Bad Bunny", 2019, "reggaeton", "chill"),
    ("Si Antes Te Hubiera Conocido", "Karol G", 2024, "reggaeton", "nostalgic"),
    ("TQG", "Karol G & Shakira", 2023, "reggaeton", "energetic"),
    ("Yandel 150", "Yandel & Feid", 2023, "reggaeton", "energetic"),
    ("La Jumpa", "Arcangel & Bad Bunny", 2022, "reggaeton", "energetic"),
    ("Provenza", "Karol G", 2022, "reggaeton", "happy"),
    ("Ojitos Lindos", "Bad Bunny & Bomba Estereo", 2022, "reggaeton", "romantic"),
    # ── 电子 / EDM ──
    ("Midnight City", "M83", 2011, "electronic", "energetic"),
    ("Strobe", "Deadmau5", 2009, "electronic", "chill"),
    ("Titanium", "David Guetta ft. Sia", 2011, "electronic", "energetic"),
    ("Wake Me Up", "Avicii", 2013, "electronic", "happy"),
    ("Lean On", "Major Lazer & DJ Snake", 2015, "electronic", "energetic"),
    ("Scared to Be Lonely", "Martin Garrix & Dua Lipa", 2017, "electronic", "sad"),
    ("Something Just Like This", "The Chainsmokers & Coldplay", 2017, "electronic", "happy"),
    ("Clarity", "Zedd ft. Foxes", 2012, "electronic", "energetic"),
    ("Don't You Worry Child", "Swedish House Mafia", 2012, "electronic", "nostalgic"),
    ("Sun Is Shining", "Axwell /\\ Ingrosso", 2015, "electronic", "happy"),
    ("Runaway (U & I)", "Galantis", 2014, "electronic", "energetic"),
    ("Faded", "Alan Walker", 2015, "electronic", "sad"),
    ("Alone", "Marshmello", 2016, "electronic", "chill"),
    ("This Is What You Came For", "Calvin Harris ft. Rihanna", 2016, "electronic", "energetic"),
    ("Animals", "Martin Garrix", 2013, "electronic", "energetic"),
    # ── 嘻哈 / 说唱 ──
    ("HUMBLE.", "Kendrick Lamar", 2017, "hiphop", "energetic"),
    ("God's Plan", "Drake", 2018, "hiphop", "chill"),
    ("Sicko Mode", "Travis Scott", 2018, "hiphop", "energetic"),
    ("Old Town Road", "Lil Nas X", 2019, "hiphop", "happy"),
    ("INDUSTRY BABY", "Lil Nas X & Jack Harlow", 2021, "hiphop", "energetic"),
    ("Lose Yourself", "Eminem", 2002, "hiphop", "energetic"),
    ("Hotline Bling", "Drake", 2015, "hiphop", "chill"),
    ("Wow.", "Post Malone", 2018, "hiphop", "happy"),
    ("Sunflower", "Post Malone & Swae Lee", 2018, "hiphop", "chill"),
    ("MONTERO", "Lil Nas X", 2021, "hiphop", "energetic"),
    ("Savage Love", "Jawsh 685 & Jason Derulo", 2020, "hiphop", "happy"),
    ("rockstar", "Post Malone ft. 21 Savage", 2017, "hiphop", "chill"),
    ("Money Trees", "Kendrick Lamar", 2012, "hiphop", "chill"),
    ("Laugh Now Cry Later", "Drake ft. Lil Durk", 2020, "hiphop", "energetic"),
    ("Dákiti", "Bad Bunny & Jhay Cortez", 2020, "hiphop", "chill"),
    # ── 独立 / 另类 ──
    ("Sweater Weather", "The Neighbourhood", 2013, "indie", "chill"),
    ("Cigarettes After Sex", "Apocalypse", 2017, "indie", "sad"),
    ("Electric Feel", "MGMT", 2007, "indie", "happy"),
    ("Tongue Tied", "Grouplove", 2011, "indie", "energetic"),
    ("Take Me to Church", "Hozier", 2013, "indie", "sad"),
    ("Somebody That I Used to Know", "Gotye", 2011, "indie", "nostalgic"),
    ("Pumped Up Kicks", "Foster the People", 2010, "indie", "chill"),
    ("Sofia", "Clairo", 2019, "indie", "chill"),
    ("Heat Waves", "Glass Animals", 2020, "indie", "nostalgic"),
    ("Line Without a Hook", "Ricky Montgomery", 2016, "indie", "romantic"),
    ("Space Song", "Beach House", 2015, "indie", "chill"),
    ("Dissolve", "Absofacto", 2015, "indie", "chill"),
    ("Notion", "The Rare Occasions", 2019, "indie", "energetic"),
    ("Two Ghosts", "Harry Styles", 2017, "indie", "nostalgic"),
    ("Mystery of Love", "Sufjan Stevens", 2017, "indie", "romantic"),
    # ── 情歌 / 浪漫 ──
    ("Perfect", "Ed Sheeran", 2017, "ballad", "romantic"),
    ("A Thousand Years", "Christina Perri", 2011, "ballad", "romantic"),
    ("Say You Won't Let Go", "James Arthur", 2016, "ballad", "romantic"),
    ("Someone Like You", "Adele", 2011, "ballad", "sad"),
    ("Let Her Go", "Passenger", 2012, "ballad", "sad"),
    ("Photograph", "Ed Sheeran", 2015, "ballad", "nostalgic"),
    ("I'm Yours", "Jason Mraz", 2008, "ballad", "happy"),
    ("Just the Way You Are", "Bruno Mars", 2010, "ballad", "romantic"),
    ("Love Me Like You Do", "Ellie Goulding", 2015, "ballad", "romantic"),
    ("Halo", "Beyonce", 2008, "ballad", "romantic"),
    ("Chasing Cars", "Snow Patrol", 2006, "ballad", "sad"),
    ("Can't Help Falling in Love", "Elvis Presley", 1961, "ballad", "romantic"),
    ("Make You Feel My Love", "Adele", 2008, "ballad", "romantic"),
    ("Die With a Smile", "Lady Gaga & Bruno Mars", 2024, "ballad", "romantic"),
    ("Rewrite the Stars", "Zac Efron & Zendaya", 2017, "ballad", "romantic"),
    # ── K-Pop ──
    ("Dynamite", "BTS", 2020, "kpop", "happy"),
    ("How You Like That", "BLACKPINK", 2020, "kpop", "energetic"),
    ("Butter", "BTS", 2021, "kpop", "happy"),
    ("LALISA", "Lisa", 2021, "kpop", "energetic"),
    ("Love Dive", "IVE", 2022, "kpop", "energetic"),
    ("Super Shy", "NewJeans", 2023, "kpop", "happy"),
    ("Cupid", "FIFTY FIFTY", 2023, "kpop", "happy"),
    ("Hype Boy", "NewJeans", 2022, "kpop", "happy"),
    ("Pink Venom", "BLACKPINK", 2022, "kpop", "energetic"),
    ("ANTIFRAGILE", "LE SSERAFIM", 2022, "kpop", "energetic"),
    ("After LIKE", "IVE", 2022, "kpop", "happy"),
    ("Ditto", "NewJeans", 2022, "kpop", "chill"),
    ("Shut Down", "BLACKPINK", 2022, "kpop", "energetic"),
    ("OMG", "NewJeans", 2023, "kpop", "happy"),
    ("Seven", "Jungkook", 2023, "kpop", "happy"),
    # ── Jazz / Blues ──
    ("Fly Me to the Moon", "Frank Sinatra", 1964, "jazz", "romantic"),
    ("What a Wonderful World", "Louis Armstrong", 1967, "jazz", "happy"),
    ("Feeling Good", "Nina Simone", 1965, "jazz", "energetic"),
    ("Take Five", "Dave Brubeck", 1959, "jazz", "chill"),
    ("At Last", "Etta James", 1960, "jazz", "romantic"),
    ("Summertime", "Ella Fitzgerald", 1968, "jazz", "chill"),
    ("Autumn Leaves", "Nat King Cole", 1955, "jazz", "nostalgic"),
    ("Come Away with Me", "Norah Jones", 2002, "jazz", "romantic"),
    ("Blue in Green", "Miles Davis", 1959, "jazz", "sad"),
    ("The Thrill Is Gone", "B.B. King", 1970, "jazz", "sad"),
    # ── 古典 / 纯音乐 ──
    ("Clair de Lune", "Debussy", 1905, "classical", "chill"),
    ("Moonlight Sonata", "Beethoven", 1801, "classical", "sad"),
    ("Canon in D", "Pachelbel", 1680, "classical", "romantic"),
    ("The Four Seasons - Spring", "Vivaldi", 1723, "classical", "happy"),
    ("Nocturne Op. 9 No. 2", "Chopin", 1832, "classical", "romantic"),
    ("River Flows in You", "Yiruma", 2001, "classical", "romantic"),
    ("Experience", "Ludovico Einaudi", 2013, "classical", "nostalgic"),
    ("Comptine d'un autre ete", "Yann Tiersen", 2001, "classical", "nostalgic"),
    ("Gymnopedies No. 1", "Erik Satie", 1888, "classical", "chill"),
    ("Time", "Hans Zimmer", 2010, "classical", "nostalgic"),
]


@router.get("/songs", response_model=list[SongPickResponse])
def get_songs(
    genre: str = None,
    mood: str = None,
    listened: bool = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    q = select(SongPick).where(SongPick.couple_id == couple_id)
    if genre:
        q = q.where(SongPick.genre == genre)
    if mood:
        q = q.where(SongPick.mood == mood)
    if listened is not None:
        q = q.where(SongPick.listened == listened)
    return session.exec(q.order_by(SongPick.created_at)).all()


@router.post("/songs/seed")
def seed_songs(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(
        select(SongPick).where(SongPick.couple_id == couple_id, SongPick.is_preset == True)
    ).first()
    if existing:
        return {"ok": True, "message": "already seeded"}
    for title, artist, year, genre, mood in _SONG_SEED:
        s = SongPick(
            couple_id=couple_id, title=title, artist=artist, year=year,
            genre=genre, mood=mood, is_preset=True, added_by=user.id,
        )
        session.add(s)
    session.commit()
    return {"ok": True, "message": "seeded", "count": len(_SONG_SEED)}


@router.get("/songs/random", response_model=SongPickResponse)
def get_random_song(
    genre: str = None,
    mood: str = None,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    q = select(SongPick).where(SongPick.couple_id == couple_id, SongPick.listened == False)
    if genre:
        q = q.where(SongPick.genre == genre)
    if mood:
        q = q.where(SongPick.mood == mood)
    songs = session.exec(q).all()
    if not songs:
        raise HTTPException(status_code=404, detail="没有可用的歌曲")
    return random.choice(songs)


@router.post("/songs", response_model=SongPickResponse)
def create_song(data: SongPickCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    song = SongPick(couple_id=couple_id, added_by=user.id, **data.model_dump())
    session.add(song)
    session.commit()
    session.refresh(song)
    return song


@router.post("/songs/{song_id}/listen")
def mark_listened(song_id: int, rating: int = None, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    song = session.get(SongPick, song_id)
    if not song or song.couple_id != couple_id:
        raise HTTPException(status_code=404)
    song.listened = True
    song.listened_at = datetime.utcnow()
    if rating is not None:
        song.rating = max(1, min(5, rating))
    session.add(song)
    session.commit()
    session.refresh(song)
    return song


@router.post("/songs/{song_id}/unlisten")
def unmark_listened(song_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    song = session.get(SongPick, song_id)
    if not song or song.couple_id != couple_id:
        raise HTTPException(status_code=404)
    song.listened = False
    song.listened_at = None
    song.rating = None
    session.add(song)
    session.commit()
    return song


@router.delete("/songs/{song_id}")
def delete_song(song_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    song = session.get(SongPick, song_id)
    if not song or song.couple_id != couple_id:
        raise HTTPException(status_code=404)
    if song.is_preset:
        raise HTTPException(status_code=403, detail="无法删除预设歌曲")
    session.delete(song)
    session.commit()
    return {"ok": True}
