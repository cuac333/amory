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
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
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
        raise HTTPException(status_code=404, detail="No hay preguntas disponibles. Usa /api/daily-question/seed primero")

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
        raise HTTPException(status_code=404, detail="Pregunta no encontrada")

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
        # --- Recuerdos y momentos ---
        "¿Qué es lo que más admiras de tu pareja?",
        "¿Cuál fue tu primera impresión?",
        "¿Qué canción te recuerda a nosotros?",
        "¿Cuál es tu recuerdo favorito juntos?",
        "¿Qué es lo que más te gusta de nuestra relación?",
        "¿Cuál ha sido el momento más divertido que hemos vivido?",
        "¿Qué es lo primero que notaste de mí?",
        "¿Cuál es tu lugar favorito para estar conmigo?",
        "¿Qué sueño te gustaría cumplir juntos?",
        "¿Qué es lo que más extrañas cuando no estamos juntos?",
        "¿Cuál fue el momento en que supiste que me amabas?",
        "¿Qué es lo más loco que harías por amor?",
        "¿Cómo te imaginas nuestra vida en 5 años?",
        "¿Cuál es tu cita ideal conmigo?",
        "¿Qué película o serie nos representa como pareja?",
        "¿Qué es lo que más te hace reír de mí?",
        "¿Cuál es tu comida favorita para compartir conmigo?",
        "¿Qué cualidad mía te enamora más?",
        "¿Qué aventura te gustaría vivir conmigo?",
        "¿Cuál es tu forma favorita de recibir amor?",
        "¿Qué momento juntos te gustaría revivir?",
        "¿Qué es lo más bonito que te he dicho?",
        "¿Qué apodo cariñoso te gusta más?",
        "¿Cuál es tu tradición favorita como pareja?",
        "¿Qué es lo que más valoras de nuestro tiempo juntos?",
        "¿Qué viaje soñado te gustaría hacer conmigo?",
        "¿Qué detalle pequeño mío te hace feliz?",
        "¿Cómo describirías nuestro amor en una palabra?",
        "¿Qué es lo más importante que hemos aprendido juntos?",
        "¿Qué mensaje le enviarías a tu yo del futuro sobre nosotros?",
        # --- Sentimientos profundos ---
        "¿En qué momento del día piensas más en mí?",
        "¿Qué es lo que más te da seguridad en nuestra relación?",
        "¿Cuál ha sido el reto más grande que hemos superado juntos?",
        "¿Qué sacrificio harías por nosotros sin pensarlo?",
        "¿Qué parte de ti sientes que yo entiendo mejor que nadie?",
        "¿Cómo te hago sentir cuando estás triste?",
        "¿Qué es lo que más te atrae físicamente de mí?",
        "¿Hay algo que nunca me hayas dicho y quieras compartir?",
        "¿Qué te hace sentir más amado/a por mí?",
        "¿Cuándo fue la última vez que sentiste mariposas conmigo?",
        "¿Qué es lo que más te emociona de envejecer juntos?",
        "¿Cómo sería tu día perfecto conmigo?",
        "¿Qué harías si pudieras retroceder al día que nos conocimos?",
        "¿Qué promesa silenciosa me has hecho?",
        "¿Cuál es tu miedo más grande respecto a nuestra relación?",
        # --- Futuro y sueños ---
        "¿Cómo te imaginas nuestra casa ideal?",
        "¿En qué ciudad del mundo te gustaría vivir conmigo?",
        "¿Cómo sería nuestra vejez juntos?",
        "¿Qué tradición nueva te gustaría crear conmigo?",
        "¿Qué meta quieres que logremos este año como pareja?",
        "¿Dónde te gustaría celebrar nuestro próximo aniversario?",
        "¿Qué hobby te gustaría aprender conmigo?",
        "¿Cómo sería la boda de tus sueños?",
        "¿Qué nombre te gusta para un futuro hijo/a?",
        "¿Qué legado te gustaría dejar como pareja?",
        "¿Qué proyecto loco te gustaría emprender conmigo?",
        "¿Cómo te imaginas nuestras navidades en 10 años?",
        "¿Qué país te gustaría visitar conmigo primero?",
        "¿Qué tipo de mascota te gustaría tener conmigo?",
        "¿Qué cambio positivo has notado en ti desde que estamos juntos?",
        # --- Diversión y creatividad ---
        "Si fuéramos personajes de una película, ¿cuál sería?",
        "¿Qué superpoder nos darías a cada uno?",
        "Si pudieras teletransportarnos ahora mismo, ¿a dónde?",
        "¿Qué animal representaría mejor nuestra relación?",
        "Si escribieras un libro sobre nosotros, ¿cuál sería el título?",
        "¿Qué canción bailarías conmigo bajo la lluvia?",
        "Si tuviéramos un restaurante juntos, ¿cómo se llamaría?",
        "¿Qué personaje de ficción me describiría mejor?",
        "Si pudieras congelar un momento nuestro para siempre, ¿cuál?",
        "¿Qué tatuaje de pareja te harías conmigo?",
        "Si fuéramos un platillo de comida, ¿cuál seríamos?",
        "¿Qué emoji nos representa como pareja?",
        "Si tuviéramos un podcast, ¿de qué hablaríamos?",
        "¿Qué serie nos vemos maratoneando este fin de semana?",
        "Si pudieras diseñar una isla para los dos, ¿qué tendría?",
        # --- Conocimiento mutuo ---
        "¿Cuál es mi color favorito?",
        "¿Qué comida pido siempre en un restaurante?",
        "¿Cuál es mi mayor inseguridad?",
        "¿Qué es lo que más me estresa?",
        "¿Cuál es mi sueño más grande en la vida?",
        "¿Qué es lo que me da más paz?",
        "¿Cuál es mi forma de pedir perdón?",
        "¿Qué hago cuando estoy nervioso/a?",
        "¿Cuál es mi película favorita de todos los tiempos?",
        "¿Qué es lo primero que hago al despertar?",
        "¿Cuál es mi mayor talento oculto?",
        "¿Qué me pone de mal humor más rápido?",
        "¿Cuál es mi comida reconfortante?",
        "¿Qué tipo de música escucho cuando estoy solo/a?",
        "¿Cuál es mi mayor orgullo personal?",
        # --- Intimidad y confianza ---
        "¿Qué es lo más vulnerable que he compartido contigo?",
        "¿Cuándo me siento más conectado/a contigo?",
        "¿Qué gesto tuyo me hace sentir protegido/a?",
        "¿Cuál es nuestro lenguaje secreto como pareja?",
        "¿Qué haces para demostrarme amor sin palabras?",
        "¿Cuál es tu momento favorito del día conmigo?",
        "¿Qué conversación nuestra cambió todo?",
        "¿Qué te da más confianza en nosotros?",
        "¿Cuál ha sido nuestra mejor reconciliación?",
        "¿Qué parte de nuestra rutina diaria amas más?",
        "¿Qué necesitas de mí cuando tienes un mal día?",
        "¿Cómo sabes que estoy pensando en ti sin decírtelo?",
        "¿Qué momento íntimo nuestro te marcó más?",
        "¿Qué admiras de cómo me comunico contigo?",
        "¿Cuál es nuestra mayor fortaleza como equipo?",
        # --- Gratitud y apreciación ---
        "¿Qué es lo más valiente que has hecho por nosotros?",
        "¿Por qué cosa me darías las gracias hoy?",
        "¿Qué aprendiste de mí que no esperabas?",
        "¿Cuál fue el mejor consejo que me diste?",
        "¿Qué regalo mío ha sido el más significativo para ti?",
        "¿Qué detalle cotidiano mío agradeces en silencio?",
        "¿Cuándo te sentiste más orgulloso/a de mí?",
        "¿Qué hice por ti que nunca olvidarás?",
        "¿Qué me agradeces que no te dije en su momento?",
        "¿Qué sacrificio mío notas aunque no lo mencione?",
        # --- Hipotéticos ---
        "Si tuviéramos que mudarnos mañana, ¿a dónde irías?",
        "Si ganáramos la lotería, ¿qué haríamos primero?",
        "Si pudiéramos vivir en cualquier época, ¿cuál elegirías?",
        "Si tuviéramos un año sabático, ¿qué haríamos?",
        "Si pudieras cambiar algo de nuestra primera cita, ¿qué sería?",
        "Si pudieras leer mi mente un día, ¿lo harías?",
        "Si tuvieras que elegir entre playa o montaña para siempre, ¿cuál?",
        "Si fuéramos los últimos dos en la tierra, ¿qué haríamos primero?",
        "Si pudieras darme un talento nuevo, ¿cuál sería?",
        "Si tuviéramos que actuar en una peli juntos, ¿qué género?",
        # --- Crecimiento personal ---
        "¿En qué he cambiado para bien desde que estamos juntos?",
        "¿Qué hábito mío te gustaría que mejorara?",
        "¿Qué has aprendido sobre el amor gracias a mí?",
        "¿Cómo he influido en tu forma de ver la vida?",
        "¿Qué consejo me darías para ser mejor pareja?",
        "¿Qué aspecto de tu vida mejoró con nuestra relación?",
        "¿Qué valor compartimos que nos mantiene unidos?",
        "¿Cómo podemos mejorar nuestra comunicación?",
        "¿Qué es algo nuevo que quieres intentar este mes?",
        "¿Qué te gustaría que hiciéramos diferente los fines de semana?",
        # --- Nostalgia ---
        "¿Recuerdas qué ropa llevaba en nuestra primera cita?",
        "¿Cuál fue el primer mensaje que nos enviamos?",
        "¿Qué recuerdas de la primera vez que me viste?",
        "¿Cuál fue la primera comida que compartimos?",
        "¿Recuerdas la primera vez que nos tomamos de la mano?",
        "¿Qué recuerdas del día que nos hicimos novios?",
        "¿Cuál fue nuestro primer viaje juntos?",
        "¿Qué recuerdas de la primera vez que conociste a mi familia?",
        "¿Cuál fue la primera canción que escuchamos juntos?",
        "¿Qué pensaste después de nuestra primera cita?",
        # --- Deseos y fantasías ---
        "¿Qué experiencia aún no hemos vivido que deseas mucho?",
        "¿Cuál sería tu escapada romántica perfecta?",
        "¿Qué cena soñada prepararías para mí?",
        "¿A qué concierto te gustaría ir conmigo?",
        "¿Qué actividad extrema harías conmigo?",
        "¿Cuál sería nuestra luna de miel perfecta?",
        "¿Qué sorpresa te encantaría recibir de mí?",
        "¿Qué fecha especial te gustaría celebrar de forma única?",
        "¿Qué tradición de otra cultura te gustaría adoptar como pareja?",
        "¿Qué clase o taller tomarías conmigo?",
        # --- Reflexiones ---
        "¿Qué significa el compromiso para ti?",
        "¿Cómo defines la lealtad en una relación?",
        "¿Qué es más importante: tener razón o estar en paz?",
        "¿Cómo manejas los celos y cómo puedo ayudarte?",
        "¿Qué opinas sobre el espacio personal en pareja?",
        "¿Cuál es tu opinión sobre las redes sociales en la relación?",
        "¿Qué significa para ti la confianza plena?",
        "¿Cómo te gustaría que resolviéramos los conflictos?",
        "¿Qué rol juega la familia en nuestra relación?",
        "¿Qué aprendiste de relaciones pasadas que valoras ahora?",
        # --- Cotidianidad dulce ---
        "¿Prefieres desayunar juntos o cenar juntos?",
        "¿Qué serie podríamos ver una y otra vez juntos?",
        "¿Abrazo largo o muchos besos cortitos?",
        "¿Mañana de domingo ideal juntos?",
        "¿Qué snack compartimos mejor?",
        "¿Llamada larga o mensajes durante el día?",
        "¿Qué canción pondrías para bailar lento conmigo ahora?",
        "¿Foto juntos favorita que tenemos?",
        "¿Qué olor te recuerda a mí?",
        "¿Cuál es nuestro chiste interno favorito?",
    ]

    if len(existing_texts) >= len(questions):
        return {"seeded": False, "message": "Ya se cargaron todas las preguntas"}

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
    send_push_to_partner(user, f"{user.name} esta pensando en ti", nudge.message or "Te quiero 💕", "/", session)
    return _build_thinking_response(nudge, session)


@router.post("/thinking-of-you/{nudge_id}/seen", response_model=ThinkingOfYouResponse)
def mark_nudge_seen(nudge_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    couple_id = require_couple(user)
    nudge = session.get(ThinkingOfYou, nudge_id)
    if not nudge or nudge.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Notificacion no encontrada")
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
