from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.gamification import Achievement, WeeklyChallenge, DateExpense, SharedCalendarEvent, BudgetConfig, MonthlyBudget
from app.schemas.gamification import (
    AchievementResponse,
    WeeklyChallengeCreate,
    WeeklyChallengeResponse,
    DateExpenseCreate,
    DateExpenseResponse,
    BudgetSummary,
    MonthBudgetEntry,
    BudgetConfigUpdate,
    BudgetConfigResponse,
    MonthlyBudgetSet,
    SharedCalendarEventCreate,
    SharedCalendarEventResponse,
)
import random
from app.routes.extras import award_xp

router = APIRouter(tags=["gamification"])


def require_couple(user: User) -> int:
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="User is not part of a couple")
    return user.couple_id


# ---------------------------------------------------------------------------
# Achievements
# ---------------------------------------------------------------------------

@router.get("/achievements", response_model=list[AchievementResponse])
def list_achievements(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    achievements = session.exec(
        select(Achievement).where(Achievement.couple_id == couple_id)
    ).all()
    return achievements


@router.post("/achievements/seed", response_model=list[AchievementResponse])
def seed_achievements(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    existing = session.exec(
        select(Achievement).where(Achievement.couple_id == couple_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Achievements already seeded")

    presets = [
        {"key": "first_photo", "title": "Primera Foto", "description": "Subieron su primera foto juntos", "icon": "camera"},
        {"key": "10_diary", "title": "Diario Fiel", "description": "Escribieron 10 entradas en el diario", "icon": "pen"},
        {"key": "first_outing", "title": "Primera Salida", "description": "Documentaron su primera salida", "icon": "map"},
        {"key": "quiz_master", "title": "Quiz Master", "description": "Respondieron 20 preguntas del quiz", "icon": "brain"},
        {"key": "5_recipes", "title": "Chefs Juntos", "description": "Agregaron 5 recetas", "icon": "chef"},
        {"key": "streak_3", "title": "Racha de 3", "description": "Completaron 3 actividades mensuales seguidas", "icon": "fire"},
        {"key": "10_songs", "title": "Playlist Lovers", "description": "Agregaron 10 canciones a su playlist", "icon": "music"},
        {"key": "all_bingo", "title": "Bingo Completo", "description": "Completaron todo el tablero de bingo", "icon": "grid"},
        {"key": "first_dream", "title": "Soñadores", "description": "Agregaron su primer sueño juntos", "icon": "sparkles"},
        {"key": "budget_saver", "title": "Ahorradores", "description": "Registraron 10 gastos de citas", "icon": "piggy"},
        {"key": "love_letters", "title": "Cartas de Amor", "description": "Escribieron 5 cartas secretas", "icon": "mail"},
        {"key": "weekly_5", "title": "5 Desafíos", "description": "Completaron 5 desafíos semanales", "icon": "trophy"},
    ]

    created = []
    for p in presets:
        achievement = Achievement(couple_id=couple_id, unlocked_at=None, created_by=user.id, **p)
        session.add(achievement)
        created.append(achievement)

    session.commit()
    for a in created:
        session.refresh(a)
    return created


@router.post("/achievements/check", response_model=list[AchievementResponse])
def check_achievements(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    now = datetime.utcnow()

    locked = session.exec(
        select(Achievement).where(
            Achievement.couple_id == couple_id,
            Achievement.unlocked_at == None,  # noqa: E711
        )
    ).all()

    if not locked:
        return []

    newly_unlocked: list[Achievement] = []

    # Build a lookup for quick access
    locked_map: dict[str, Achievement] = {a.key: a for a in locked}

    # Check: budget_saver — 10 expenses
    if "budget_saver" in locked_map:
        expense_count = session.exec(
            select(func.count()).select_from(DateExpense).where(DateExpense.couple_id == couple_id)
        ).one()
        if expense_count >= 10:
            locked_map["budget_saver"].unlocked_at = now
            newly_unlocked.append(locked_map["budget_saver"])

    # Check: weekly_5 — 5 completed challenges
    if "weekly_5" in locked_map:
        completed_count = session.exec(
            select(func.count()).select_from(WeeklyChallenge).where(
                WeeklyChallenge.couple_id == couple_id,
                WeeklyChallenge.status == "completed",
            )
        ).one()
        if completed_count >= 5:
            locked_map["weekly_5"].unlocked_at = now
            newly_unlocked.append(locked_map["weekly_5"])

    # Check: first_outing — at least 1 calendar event with category "date" or "trip"
    if "first_outing" in locked_map:
        outing_count = session.exec(
            select(func.count()).select_from(SharedCalendarEvent).where(
                SharedCalendarEvent.couple_id == couple_id,
                SharedCalendarEvent.category.in_(["date", "trip"]),
            )
        ).one()
        if outing_count >= 1:
            locked_map["first_outing"].unlocked_at = now
            newly_unlocked.append(locked_map["first_outing"])

    if newly_unlocked:
        session.commit()
        for a in newly_unlocked:
            session.refresh(a)

    return newly_unlocked


# ---------------------------------------------------------------------------
# Weekly Challenges
# ---------------------------------------------------------------------------

PRESET_CHALLENGES = [
    "Cocinar algo nuevo juntos",
    "Escribirse una carta de amor",
    "Ver el atardecer juntos",
    "Hacerse un masaje",
    "Llamarse sin razón solo para decir te amo",
    "Preparar el desayuno para el otro",
    "Tomar una foto juntos",
    "Contar 3 cosas que admiras del otro",
    "Bailar una canción en la sala",
    "Probar un restaurante nuevo",
    "Hacer ejercicio juntos",
    "Ver una película que elija el otro",
    "Escribir un poema corto",
    "Planear una cita sorpresa",
    "Desconectarse del celular una tarde",
]


def _current_monday() -> str:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


@router.get("/challenges", response_model=list[WeeklyChallengeResponse])
def list_challenges(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    challenges = session.exec(
        select(WeeklyChallenge)
        .where(WeeklyChallenge.couple_id == couple_id)
        .order_by(WeeklyChallenge.week_start.desc())
    ).all()
    return challenges


@router.get("/challenges/current", response_model=WeeklyChallengeResponse)
def get_current_challenge(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    monday = _current_monday()

    challenge = session.exec(
        select(WeeklyChallenge).where(
            WeeklyChallenge.couple_id == couple_id,
            WeeklyChallenge.week_start == monday,
        )
    ).first()

    if not challenge:
        title = random.choice(PRESET_CHALLENGES)
        challenge = WeeklyChallenge(
            couple_id=couple_id,
            title=title,
            week_start=monday,
            is_preset=True,
        )
        session.add(challenge)
        session.commit()
        session.refresh(challenge)

    return challenge


@router.post("/challenges", response_model=WeeklyChallengeResponse)
def create_challenge(
    data: WeeklyChallengeCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    monday = _current_monday()

    challenge = WeeklyChallenge(
        couple_id=couple_id,
        title=data.title,
        description=data.description,
        week_start=monday,
        is_preset=False,
    )
    session.add(challenge)
    session.commit()
    session.refresh(challenge)
    try:
        award_xp(couple_id, user.id, "challenge_created", 10, session)
    except Exception:
        pass
    return challenge


@router.post("/challenges/{id}/complete", response_model=WeeklyChallengeResponse)
def complete_challenge(
    id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    challenge = session.get(WeeklyChallenge, id)
    if not challenge or challenge.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if challenge.status == "completed":
        raise HTTPException(status_code=400, detail="Challenge already completed")

    challenge.status = "completed"
    challenge.completed_by = user.id
    challenge.completed_at = datetime.utcnow()

    session.add(challenge)
    session.commit()
    session.refresh(challenge)
    try:
        award_xp(couple_id, user.id, "challenge_completed", 25, session)
    except Exception:
        pass
    return challenge


@router.post("/challenges/seed", response_model=list[WeeklyChallengeResponse])
def seed_challenges(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    existing = session.exec(
        select(WeeklyChallenge).where(
            WeeklyChallenge.couple_id == couple_id,
            WeeklyChallenge.is_preset == True,  # noqa: E712
        )
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Preset challenges already seeded")

    monday = _current_monday()
    created = []
    for i, title in enumerate(PRESET_CHALLENGES):
        week = (date.fromisoformat(monday) + timedelta(weeks=i)).isoformat()
        challenge = WeeklyChallenge(
            couple_id=couple_id,
            title=title,
            week_start=week,
            is_preset=True,
        )
        session.add(challenge)
        created.append(challenge)

    session.commit()
    for c in created:
        session.refresh(c)
    return created


@router.delete("/challenges/{id}")
def delete_challenge(
    id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    challenge = session.get(WeeklyChallenge, id)
    if not challenge or challenge.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Challenge not found")

    session.delete(challenge)
    session.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Date Budget
# ---------------------------------------------------------------------------

@router.get("/budget", response_model=list[DateExpenseResponse])
def list_expenses(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    expenses = session.exec(
        select(DateExpense)
        .where(DateExpense.couple_id == couple_id)
        .order_by(DateExpense.expense_date.desc())
    ).all()
    return expenses


@router.get("/budget/summary", response_model=BudgetSummary)
def budget_summary(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    expenses = session.exec(
        select(DateExpense).where(DateExpense.couple_id == couple_id)
    ).all()

    total = sum(e.amount for e in expenses)

    by_category: dict[str, float] = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0.0) + e.amount

    this_month = date.today().strftime("%Y-%m")
    month_total = sum(e.amount for e in expenses if e.expense_date.startswith(this_month))

    # Get budget config + per-month budgets
    config = session.exec(
        select(BudgetConfig).where(BudgetConfig.couple_id == couple_id)
    ).first()
    default_budget = config.default_budget if config else 0.0
    custom_cats = [c for c in (config.custom_categories.split(",") if config and config.custom_categories else []) if c]

    month_budgets_rows = session.exec(
        select(MonthlyBudget).where(MonthlyBudget.couple_id == couple_id)
    ).all()
    per_month_budgets: dict[str, float] = {mb.month: mb.amount for mb in month_budgets_rows}

    def get_budget_for(m: str) -> float:
        return per_month_budgets.get(m, default_budget)

    # Build monthly history with rollover
    monthly_history: list[MonthBudgetEntry] = []
    effective_budget = get_budget_for(this_month)
    remaining = 0.0

    has_any_budget = default_budget > 0 or len(per_month_budgets) > 0

    if has_any_budget and expenses:
        by_month: dict[str, float] = {}
        for e in expenses:
            m = e.expense_date[:7]
            by_month[m] = by_month.get(m, 0.0) + e.amount

        all_months_set = set(by_month.keys()) | set(per_month_budgets.keys())
        all_months_set.add(this_month)
        sorted_months = sorted(all_months_set)

        filled_months: list[str] = []
        if sorted_months:
            cur = date.fromisoformat(sorted_months[0] + "-01")
            end = date.fromisoformat(sorted_months[-1] + "-01")
            while cur <= end:
                filled_months.append(cur.strftime("%Y-%m"))
                if cur.month == 12:
                    cur = cur.replace(year=cur.year + 1, month=1)
                else:
                    cur = cur.replace(month=cur.month + 1)

        rollover = 0.0
        for m in filled_months:
            spent = by_month.get(m, 0.0)
            base = get_budget_for(m)
            budget_with_rollover = base + rollover
            month_remaining = budget_with_rollover - spent
            monthly_history.append(MonthBudgetEntry(
                month=m,
                budget=budget_with_rollover,
                rollover=rollover,
                spent=spent,
                remaining=month_remaining,
            ))
            rollover = max(month_remaining, 0.0)

        current_entry = next((e for e in monthly_history if e.month == this_month), None)
        if current_entry:
            effective_budget = current_entry.budget
            remaining = current_entry.remaining
        else:
            effective_budget = get_budget_for(this_month) + rollover
            remaining = effective_budget - month_total
    elif has_any_budget:
        effective_budget = get_budget_for(this_month)
        remaining = effective_budget

    return BudgetSummary(
        total=total,
        by_category=by_category,
        month_total=month_total,
        this_month=this_month,
        default_budget=default_budget,
        effective_budget=effective_budget,
        remaining=remaining,
        custom_categories=custom_cats,
        monthly_history=monthly_history,
        per_month_budgets=per_month_budgets,
    )


@router.get("/budget/config", response_model=BudgetConfigResponse)
def get_budget_config(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    config = session.exec(
        select(BudgetConfig).where(BudgetConfig.couple_id == couple_id)
    ).first()
    if not config:
        config = BudgetConfig(couple_id=couple_id)
        session.add(config)
        session.commit()
        session.refresh(config)
    cats = [c for c in (config.custom_categories.split(",") if config.custom_categories else []) if c]
    return BudgetConfigResponse(
        id=config.id,
        couple_id=config.couple_id,
        default_budget=config.default_budget,
        custom_categories=cats,
        updated_at=config.updated_at,
    )


@router.put("/budget/config", response_model=BudgetConfigResponse)
def update_budget_config(
    data: BudgetConfigUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    config = session.exec(
        select(BudgetConfig).where(BudgetConfig.couple_id == couple_id)
    ).first()
    if not config:
        config = BudgetConfig(couple_id=couple_id)
        session.add(config)

    if data.default_budget is not None:
        config.default_budget = data.default_budget
    if data.custom_categories is not None:
        config.custom_categories = ",".join(data.custom_categories)
    config.updated_at = datetime.utcnow()

    session.add(config)
    session.commit()
    session.refresh(config)
    cats = [c for c in (config.custom_categories.split(",") if config.custom_categories else []) if c]
    return BudgetConfigResponse(
        id=config.id,
        couple_id=config.couple_id,
        default_budget=config.default_budget,
        custom_categories=cats,
        updated_at=config.updated_at,
    )


@router.put("/budget/month-budget")
def set_month_budget(
    data: MonthlyBudgetSet,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    existing = session.exec(
        select(MonthlyBudget).where(
            MonthlyBudget.couple_id == couple_id,
            MonthlyBudget.month == data.month,
        )
    ).first()
    if existing:
        existing.amount = data.amount
        session.add(existing)
    else:
        mb = MonthlyBudget(couple_id=couple_id, month=data.month, amount=data.amount)
        session.add(mb)
    session.commit()
    return {"ok": True, "month": data.month, "amount": data.amount}


@router.delete("/budget/month-budget/{month}")
def delete_month_budget(
    month: str,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    existing = session.exec(
        select(MonthlyBudget).where(
            MonthlyBudget.couple_id == couple_id,
            MonthlyBudget.month == month,
        )
    ).first()
    if existing:
        session.delete(existing)
        session.commit()
    return {"ok": True}


@router.post("/budget", response_model=DateExpenseResponse)
def create_expense(
    data: DateExpenseCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    expense = DateExpense(
        couple_id=couple_id,
        added_by=user.id,
        title=data.title,
        amount=data.amount,
        category=data.category,
        expense_date=data.expense_date,
        note=data.note,
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    try:
        award_xp(couple_id, user.id, "expense_logged", 3, session)
    except Exception:
        pass
    return expense


@router.delete("/budget/{id}")
def delete_expense(
    id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    expense = session.get(DateExpense, id)
    if not expense or expense.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Expense not found")
    if expense.added_by != user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this expense")

    session.delete(expense)
    session.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Shared Calendar
# ---------------------------------------------------------------------------

@router.get("/calendar", response_model=list[SharedCalendarEventResponse])
def list_calendar_events(
    month: str = Query(default=None, description="Filter by month, e.g. 2026-03"),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    stmt = select(SharedCalendarEvent).where(SharedCalendarEvent.couple_id == couple_id)

    if month:
        stmt = stmt.where(SharedCalendarEvent.event_date.startswith(month))

    stmt = stmt.order_by(SharedCalendarEvent.event_date.asc())

    events = session.exec(stmt).all()
    return events


@router.post("/calendar", response_model=SharedCalendarEventResponse)
def create_calendar_event(
    data: SharedCalendarEventCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    event = SharedCalendarEvent(
        couple_id=couple_id,
        added_by=user.id,
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        event_time=data.event_time,
        category=data.category,
        icon=data.icon,
        recurring=data.recurring,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    try:
        award_xp(couple_id, user.id, "calendar_event", 5, session)
    except Exception:
        pass
    return event


@router.delete("/calendar/{id}")
def delete_calendar_event(
    id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)

    event = session.get(SharedCalendarEvent, id)
    if not event or event.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.added_by != user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this event")

    session.delete(event)
    session.commit()
    return {"ok": True}


@router.get("/calendar/upcoming")
def get_upcoming_events(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return events in the next 30 days, including recurring ones expanded."""
    couple_id = require_couple(user)
    today = date.today()
    end = today + timedelta(days=30)

    events = session.exec(
        select(SharedCalendarEvent).where(SharedCalendarEvent.couple_id == couple_id)
    ).all()

    upcoming = []
    for ev in events:
        ev_date = date.fromisoformat(ev.event_date)

        if ev.recurring == "yearly":
            # Check if this year's occurrence falls in range
            this_year = ev_date.replace(year=today.year)
            if this_year < today:
                this_year = ev_date.replace(year=today.year + 1)
            if today <= this_year <= end:
                upcoming.append({
                    "id": ev.id, "title": ev.title, "event_date": this_year.isoformat(),
                    "event_time": ev.event_time, "category": ev.category, "icon": ev.icon,
                    "recurring": ev.recurring, "days_until": (this_year - today).days,
                })
        elif ev.recurring == "monthly":
            # Check this month and next month
            for month_offset in range(2):
                m = today.month + month_offset
                y = today.year
                if m > 12:
                    m -= 12
                    y += 1
                try:
                    candidate = ev_date.replace(year=y, month=m)
                except ValueError:
                    continue
                if today <= candidate <= end:
                    upcoming.append({
                        "id": ev.id, "title": ev.title, "event_date": candidate.isoformat(),
                        "event_time": ev.event_time, "category": ev.category, "icon": ev.icon,
                        "recurring": ev.recurring, "days_until": (candidate - today).days,
                    })
        elif ev.recurring == "weekly":
            # Find next occurrence within range
            diff = (ev_date.weekday() - today.weekday()) % 7
            candidate = today + timedelta(days=diff if diff > 0 else 7)
            while candidate <= end:
                upcoming.append({
                    "id": ev.id, "title": ev.title, "event_date": candidate.isoformat(),
                    "event_time": ev.event_time, "category": ev.category, "icon": ev.icon,
                    "recurring": ev.recurring, "days_until": (candidate - today).days,
                })
                candidate += timedelta(days=7)
        else:
            # One-time event
            if today <= ev_date <= end:
                upcoming.append({
                    "id": ev.id, "title": ev.title, "event_date": ev_date.isoformat(),
                    "event_time": ev.event_time, "category": ev.category, "icon": ev.icon,
                    "recurring": ev.recurring, "days_until": (ev_date - today).days,
                })

    upcoming.sort(key=lambda x: x["event_date"])
    return upcoming
