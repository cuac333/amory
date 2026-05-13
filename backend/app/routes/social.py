import random
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.routes.notification import send_push_to_partner
from app.models.social import DailyQuestion, DailyAnswer, ThinkingOfYou
from app.schemas.social import (
    DailyQuestionCreate, DailyQuestionResponse,
    DailyAnswerCreate, DailyAnswerResponse,
    ThinkingOfYouCreate, ThinkingOfYouResponse,
)

router = APIRouter(tags=["social"])


def require_couple(user: User):
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


def _build_question_response(q: DailyQuestion, session: Session) -> DailyQuestionResponse:
    answers = session.exec(select(DailyAnswer).where(DailyAnswer.question_id == q.id)).all()
    answer_responses = []
    for a in answers:
        author = session.get(User, a.user_id)
        answer_responses.append(DailyAnswerResponse(
            id=a.id, question_id=a.question_id, user_id=a.user_id,
            user_name=author.name if author else "",
            answer_text=a.answer_text, created_at=a.created_at,
        ))
    return DailyQuestionResponse(
        id=q.id, couple_id=q.couple_id, question_text=q.question_text,
        is_preset=q.is_preset, date=q.date,
        answers=answer_responses, created_at=q.created_at,
    )


def _build_thinking_response(t: ThinkingOfYou, session: Session) -> ThinkingOfYouResponse:
    sender = session.get(User, t.sender_id)
    return ThinkingOfYouResponse(
        id=t.id, couple_id=t.couple_id, sender_id=t.sender_id,
        sender_name=sender.name if sender else "",
        message=t.message, seen=t.seen, created_at=t.created_at,
    )


# --- Daily Question ---

@router.get("/daily-question/today", response_model=DailyQuestionResponse)
def get_today_question(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    today_str = date.today().isoformat()

    question = session.exec(
        select(DailyQuestion).where(
            DailyQuestion.couple_id == couple_id,
            DailyQuestion.date == today_str,
        )
    ).first()

    if question:
        return _build_question_response(question, session)

    # No question for today — pick a random preset not yet used
    presets = session.exec(
        select(DailyQuestion).where(
            DailyQuestion.couple_id == couple_id,
            DailyQuestion.is_preset == True,
        )
    ).all()

    if not presets:
        raise HTTPException(status_code=404, detail="没有可用的问题，请先使用 /api/daily-question/seed")

    # Get already used question texts
    used = session.exec(
        select(DailyQuestion).where(
            DailyQuestion.couple_id == couple_id,
            DailyQuestion.is_preset == False,
            DailyQuestion.date != "",
        )
    ).all()
    used_texts = {q.question_text for q in used}

    # Filter to unused presets
    available = [p for p in presets if p.question_text not in used_texts]
    if not available:
        # All used — reset and allow repeats
        available = presets

    chosen = random.choice(available)
    new_question = DailyQuestion(
        couple_id=couple_id,
        question_text=chosen.question_text,
        is_preset=False,
        date=today_str,
    )
    session.add(new_question)
    session.commit()
    session.refresh(new_question)
    return _build_question_response(new_question, session)


@router.post("/daily-question", response_model=DailyQuestionResponse)
def create_daily_question(data: DailyQuestionCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    today_str = date.today().isoformat()
    question = DailyQuestion(
        couple_id=couple_id,
        question_text=data.question_text,
        is_preset=False,
        date=today_str,
    )
    session.add(question)
    session.commit()
    session.refresh(question)
    return _build_question_response(question, session)


@router.post("/daily-question/{question_id}/answer", response_model=DailyQuestionResponse)
def answer_daily_question(question_id: int, data: DailyAnswerCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    question = session.get(DailyQuestion, question_id)
    if not question or question.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="问题未找到")

    # Upsert: update if already answered, create if not
    existing = session.exec(
        select(DailyAnswer).where(
            DailyAnswer.question_id == question_id,
            DailyAnswer.user_id == user.id,
        )
    ).first()

    if existing:
        existing.answer_text = data.answer_text
        existing.created_at = datetime.utcnow()
        session.add(existing)
    else:
        answer = DailyAnswer(
            question_id=question_id,
            user_id=user.id,
            answer_text=data.answer_text,
        )
        session.add(answer)

    session.commit()
    return _build_question_response(question, session)


@router.post("/daily-question/seed")
def seed_daily_questions(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    existing = session.exec(
        select(DailyQuestion).where(
            DailyQuestion.couple_id == couple_id,
            DailyQuestion.is_preset == True,
        )
    ).all()
    existing_texts = {q.question_text for q in existing}

    questions = [
        # --- 回忆与时刻 ---
        "你最欣赏伴侣的什么？",
        "你的第一印象是什么？",
        "哪首歌让你想起我们？",
        "你最美好的共同回忆是什么？",
        "你最喜欢我们关系的哪一点？",
        "我们经历过的最开心的时刻是什么？",
        "你最先注意到我的是什么？",
        "你最喜欢和我待在什么地方？",
        "你想一起实现什么梦想？",
        "不在一起的时候你最想念什么？",
        "你是什么时候确定你爱我的？",
        "你为爱做过的最疯狂的事是什么？",
        "你想象我们5年后的生活是什么样？",
        "你理想中和我的约会是什么样的？",
        "哪部电影或电视剧最能代表我们？",
        "我做什么最容易让你笑？",
        "你最喜欢和我一起吃什么？",
        "我的什么特质最让你心动？",
        "你想和我一起经历什么冒险？",
        "你最喜欢用什么方式感受爱？",
        "你想重温我们在一起的哪个时刻？",
        "我跟你说过的最美好的话是什么？",
        "你最喜欢什么昵称？",
        "你最喜欢我们作为情侣的什么传统？",
        "你最珍惜我们在一起的什么？",
        "你梦想中和我一起去哪里旅行？",
        "我的什么小细节能让你开心？",
        "用一个词形容我们的爱？",
        "我们一起学到的最重要的事是什么？",
        "你会给未来的自己发什么关于我们的消息？",
        # --- 深层情感 ---
        "一天中你什么时候最想我？",
        "我们的关系中什么让你最有安全感？",
        "我们一起克服的最大挑战是什么？",
        "你会毫不犹豫地为我们做出什么牺牲？",
        "你觉得我比任何人都更了解你的哪一面？",
        "我难过的时候你会有什么感觉？",
        "我身体的什么最吸引你？",
        "有没有什么你一直想对我说但没说的？",
        "什么让你最感受到我的爱？",
        "你上一次为我们心动是什么时候？",
        "一起变老最让你期待什么？",
        "和我在一起你完美的一天是什么样的？",
        "如果能回到我们认识的那天，你会做什么？",
        "你默默对我做过什么承诺？",
        "关于我们的关系你最大的恐惧是什么？",
        # --- 未来与梦想 ---
        "你理想中我们的家是什么样的？",
        "你最想和我在世界哪个城市生活？",
        "你觉得我们老了会是什么样？",
        "你想和我创造什么新传统？",
        "今年你想和我一起实现什么目标？",
        "你想在哪里庆祝下一个纪念日？",
        "你想和我一起学什么新爱好？",
        "你梦想中的婚礼是什么样的？",
        "你喜欢给孩子取什么名字？",
        "你想留下什么作为情侣的遗产？",
        "你想和我一起做什么疯狂的项目？",
        "你想象10年后我们的圣诞节是什么样的？",
        "你最想先和我去哪个国家？",
        "你想和我一起养什么宠物？",
        "在一起后你注意到自己有什么积极的变化？",
        # --- 趣味与创意 ---
        "如果我们是电影角色，会是哪部电影？",
        "你会给我们各赋予什么超能力？",
        "如果现在能瞬间传送，你想去哪里？",
        "什么动物最能代表我们的关系？",
        "如果你写一本关于我们的书，书名是什么？",
        "你想在雨中和我跳什么舞？",
        "如果我们一起开餐厅，叫什么名字？",
        "哪个虚构角色最能形容我？",
        "如果能永远定格我们的一个瞬间，你会选哪个？",
        "你会和我一起纹什么情侣纹身？",
        "如果我们是一道菜，会是什么？",
        "哪个emoji最能代表我们？",
        "如果我们有播客，会聊什么？",
        "这个周末我们会一起追什么剧？",
        "如果你能为我们设计一个小岛，上面会有什么？",
        # --- 互相了解 ---
        "我最喜欢什么颜色？",
        "我在餐厅总是点什么？",
        "我最大的不安全感是什么？",
        "什么最容易让我有压力？",
        "我人生中最大的梦想是什么？",
        "什么让我最平静？",
        "我道歉的方式是什么？",
        "我紧张的时候会做什么？",
        "我最喜欢的电影是哪部？",
        "我醒来第一件事做什么？",
        "我最大的隐藏才能是什么？",
        "什么最容易让我心情不好？",
        "我最爱吃的安慰食物是什么？",
        "我一个人的时候听什么音乐？",
        "我最自豪的个人成就是什么？",
        # --- 亲密与信任 ---
        "我对你分享过的最脆弱的一面是什么？",
        "什么时候我感觉和你最亲密？",
        "你的什么举动让我最有安全感？",
        "我们之间有什么秘密暗号？",
        "你不用语言怎么表达对我的爱？",
        "一天中你最喜欢和我在一起的时刻？",
        "我们的哪次对话改变了一切？",
        "什么让你对我们最有信心？",
        "我们最好的一次和好是什么？",
        "你最喜欢我们日常生活的哪一部分？",
        "你心情不好的时候需要我做什么？",
        "你怎么知道我在想你？",
        "我们的哪个亲密时刻对你影响最大？",
        "你欣赏我和你沟通的什么方式？",
        "作为团队我们最大的优势是什么？",
        # --- 感恩与欣赏 ---
        "你为我们做过的最勇敢的事是什么？",
        "今天你会因为什么感谢我？",
        "你从我身上学到了什么意想不到的？",
        "我给过你最好的建议是什么？",
        "我送过你最有意义的礼物是什么？",
        "你在心里默默感激我的什么日常小事？",
        "你什么时候最为我骄傲？",
        "我为你做过什么你永远不会忘记的？",
        "你感激我当时没说出口的是什么？",
        "你注意到了我什么没提过的牺牲？",
        # --- 假设性问题 ---
        "如果明天我们要搬家，你想去哪里？",
        "如果我们中了彩票，第一件事做什么？",
        "如果能活在任何时代，你选哪个？",
        "如果我们有一个休假年，会做什么？",
        "如果能改变我们的第一次约会，你会改什么？",
        "如果能读我的心一天，你愿意吗？",
        "如果永远只能选海滩或山区，你选哪个？",
        "如果我们是地球上最后两个人，第一件事做什么？",
        "如果能给我一种新才能，你选什么？",
        "如果我们要一起演电影，什么类型？",
        # --- 个人成长 ---
        "在一起后我有什么好的变化？",
        "你希望我改掉什么习惯？",
        "通过我你学到了什么关于爱的东西？",
        "我怎么影响了你看世界的方式？",
        "你会给我什么建议让我成为更好的伴侣？",
        "我们在一起后你生活哪方面变好了？",
        "什么共同价值观让我们一直在一起？",
        "我们怎么改善沟通？",
        "这个月你想尝试什么新事物？",
        "周末你想让我们做什么不一样的事？",
        # --- 怀旧 ---
        "你记得我第一次约会穿的什么吗？",
        "我们发的第一条消息是什么？",
        "你记得第一次见到我的情景吗？",
        "我们一起吃的第一顿饭是什么？",
        "你记得我们第一次牵手的时候吗？",
        "你记得我们在一起那天的事吗？",
        "我们的第一次旅行是去哪里？",
        "你记得第一次见我家人的情景吗？",
        "我们一起听的第一首歌是什么？",
        "第一次约会后你想了什么？",
        # --- 愿望与幻想 ---
        "你最想和我一起体验什么还没做过的事？",
        "你完美的浪漫旅行是什么样的？",
        "你会为我做什么样的梦幻晚餐？",
        "你想和我一起去听什么演唱会？",
        "你会和我一起做什么极限运动？",
        "我们完美的蜜月是什么样的？",
        "你最想收到我什么样的惊喜？",
        "你想用什么特别的方式庆祝哪个节日？",
        "你想和我一起采用其他文化的什么传统？",
        "你想和我一起上什么课或工作坊？",
        # --- 反思 ---
        "承诺对你来说意味着什么？",
        "你怎么定义感情中的忠诚？",
        "哪个更重要：有道理还是和平相处？",
        "你怎么处理嫉妒？我能怎么帮你？",
        "你对情侣之间的个人空间怎么看？",
        "你对社交媒体在感情中的角色怎么看？",
        "完全信任对你来说意味着什么？",
        "你希望我们怎么解决矛盾？",
        "家庭在我们的关系中扮演什么角色？",
        "你从过去的感情中学到了什么现在珍惜的？",
        # --- 甜蜜日常 ---
        "你喜欢一起吃早餐还是一起吃晚餐？",
        "我们可以反复看什么剧？",
        "长长的拥抱还是很多个小吻？",
        "理想的周日早上一起做什么？",
        "我们最适合分享什么零食？",
        "长时间通话还是一天中互发消息？",
        "现在你会放什么歌和我跳慢舞？",
        "我们最喜欢的一起拍的照片是哪张？",
        "什么味道让你想起我？",
        "我们之间最喜欢什么内部笑话？",
    ]

    if len(existing_texts) >= len(questions):
        return {"seeded": False, "message": "所有问题已加载"}

    count = 0
    for text in questions:
        if text not in existing_texts:
            q = DailyQuestion(
                couple_id=couple_id,
                question_text=text,
                is_preset=True,
                date="",
            )
            session.add(q)
            count += 1
    session.commit()
    return {"seeded": True, "count": count, "total": len(existing_texts) + count}


# --- Daily Question Streak ---

@router.get("/daily-question/streak")
def get_daily_streak(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Count consecutive days with at least one answer to the daily question."""
    couple_id = require_couple(user)
    # Get all questions for this couple that have at least one answer, ordered by date desc
    questions = session.exec(
        select(DailyQuestion).where(
            DailyQuestion.couple_id == couple_id,
            DailyQuestion.date != "",
        ).order_by(DailyQuestion.date.desc())
    ).all()

    # Build set of dates that have at least one answer
    answered_dates: set[str] = set()
    for q in questions:
        answers = session.exec(
            select(DailyAnswer).where(DailyAnswer.question_id == q.id)
        ).all()
        if answers:
            answered_dates.add(q.date)

    if not answered_dates:
        return {"current_streak": 0, "best_streak": 0}

    # Calculate streaks by walking backwards from today
    today = date.today()
    current_streak = 0
    best_streak = 0
    streak = 0
    day = today

    # Check if today or yesterday has an answer (grace: streak doesn't break until end of today)
    today_str = today.isoformat()
    yesterday_str = (today - timedelta(days=1)).isoformat()
    if today_str not in answered_dates and yesterday_str not in answered_dates:
        current_streak = 0
    else:
        # Walk backwards from the most recent answered day
        if today_str in answered_dates:
            day = today
        else:
            day = today - timedelta(days=1)

        while day.isoformat() in answered_dates:
            current_streak += 1
            day -= timedelta(days=1)

    # Calculate best streak from all answered dates
    sorted_dates = sorted(answered_dates)
    streak = 1
    best_streak = 1
    for i in range(1, len(sorted_dates)):
        prev = date.fromisoformat(sorted_dates[i - 1])
        curr = date.fromisoformat(sorted_dates[i])
        if (curr - prev).days == 1:
            streak += 1
            best_streak = max(best_streak, streak)
        else:
            streak = 1

    best_streak = max(best_streak, current_streak)

    return {"current_streak": current_streak, "best_streak": best_streak}


# --- Thinking of You ---

@router.get("/thinking-of-you", response_model=list[ThinkingOfYouResponse])
def get_unseen_nudges(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    nudges = session.exec(
        select(ThinkingOfYou).where(
            ThinkingOfYou.couple_id == couple_id,
            ThinkingOfYou.sender_id != user.id,
            ThinkingOfYou.seen == False,
        ).order_by(ThinkingOfYou.created_at.desc())
    ).all()
    return [_build_thinking_response(n, session) for n in nudges]


@router.post("/thinking-of-you", response_model=ThinkingOfYouResponse)
def send_nudge(data: ThinkingOfYouCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    nudge = ThinkingOfYou(
        couple_id=couple_id,
        sender_id=user.id,
        message=data.message,
    )
    session.add(nudge)
    session.commit()
    session.refresh(nudge)
    send_push_to_partner(user, f"{user.name}在想你", nudge.message or "想你了 💕", "/", session)
    return _build_thinking_response(nudge, session)


@router.post("/thinking-of-you/{nudge_id}/seen", response_model=ThinkingOfYouResponse)
def mark_nudge_seen(nudge_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    nudge = session.get(ThinkingOfYou, nudge_id)
    if not nudge or nudge.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="通知未找到")
    nudge.seen = True
    session.add(nudge)
    session.commit()
    session.refresh(nudge)
    return _build_thinking_response(nudge, session)


@router.get("/thinking-of-you/history", response_model=list[ThinkingOfYouResponse])
def get_nudge_history(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    nudges = session.exec(
        select(ThinkingOfYou).where(
            ThinkingOfYou.couple_id == couple_id,
        ).order_by(ThinkingOfYou.created_at.desc()).limit(20)
    ).all()
    return [_build_thinking_response(n, session) for n in nudges]
