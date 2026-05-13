import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session, engine
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.ticket import TicketWatch
from app.schemas.ticket import (
    TicketSearchResponse,
    TicketSearchResult,
    TicketWatchCreate,
    TicketWatchResponse,
)
from app.services import ticketmaster
from app.routes.notification import send_push_to_user
from app.config import TICKETMASTER_POLL_SECONDS, TICKETMASTER_API_KEY

router = APIRouter(prefix="/tickets", tags=["tickets"])

log = logging.getLogger("amory.tickets")


def _require_couple(user: User) -> int:
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣")
    return user.couple_id


@router.get("/config")
def get_config():
    """Expose whether the backend has an API key configured (non-secret)."""
    return {
        "api_key_configured": bool(TICKETMASTER_API_KEY),
        "poll_seconds": TICKETMASTER_POLL_SECONDS,
    }


@router.get("/search", response_model=TicketSearchResponse)
def search(
    q: str = Query(..., min_length=2),
    country: Optional[str] = None,
    city: Optional[str] = None,
    _: User = Depends(get_current_user),
):
    """Search Ticketmaster events by keyword, optional country (ISO-2) and city."""
    try:
        results = ticketmaster.search_events(
            q,
            country_code=country,
            city=city or None,
        )
    except ticketmaster.TicketmasterError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return TicketSearchResponse(
        results=[TicketSearchResult(**r) for r in results]
    )


@router.get("/", response_model=list[TicketWatchResponse])
def list_watches(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = _require_couple(user)
    watches = session.exec(
        select(TicketWatch)
        .where(TicketWatch.couple_id == couple_id)
        .order_by(TicketWatch.created_at.desc())
    ).all()
    return watches


@router.post("/", response_model=TicketWatchResponse)
def create_watch(
    data: TicketWatchCreate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = _require_couple(user)

    # Dedupe: one watch per event per couple
    existing = session.exec(
        select(TicketWatch).where(
            TicketWatch.couple_id == couple_id,
            TicketWatch.event_id == data.event_id,
        )
    ).first()
    if existing:
        # Re-activate if it was deactivated
        if not existing.active:
            existing.active = True
            session.add(existing)
            session.commit()
            session.refresh(existing)
        return existing

    watch = TicketWatch(
        couple_id=couple_id,
        created_by=user.id,
        event_id=data.event_id,
        event_name=data.event_name,
        event_url=data.event_url,
        image_url=data.image_url,
        venue=data.venue,
        city=data.city,
        event_date=data.event_date,
        status="unknown",
    )
    session.add(watch)
    session.commit()
    session.refresh(watch)

    # Fire an immediate check so the user sees a status right away
    try:
        _check_watch(watch, session, user_id=user.id)
    except Exception:
        pass

    return watch


@router.post("/{watch_id}/check", response_model=TicketWatchResponse)
def check_now(
    watch_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = _require_couple(user)
    watch = session.get(TicketWatch, watch_id)
    if not watch or watch.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="监控未找到")
    _check_watch(watch, session, user_id=user.id)
    return watch


@router.delete("/{watch_id}")
def delete_watch(
    watch_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = _require_couple(user)
    watch = session.get(TicketWatch, watch_id)
    if not watch or watch.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="监控未找到")
    session.delete(watch)
    session.commit()
    return {"ok": True}


@router.patch("/{watch_id}")
def toggle_active(
    watch_id: int,
    active: bool,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = _require_couple(user)
    watch = session.get(TicketWatch, watch_id)
    if not watch or watch.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="监控未找到")
    watch.active = active
    session.add(watch)
    session.commit()
    session.refresh(watch)
    return watch


# ── Status check & notification ──

def _check_watch(watch: TicketWatch, session: Session, user_id: Optional[int] = None):
    """Fetch current status from Ticketmaster and notify the couple if it changed."""
    try:
        ev = ticketmaster.get_event(watch.event_id)
        watch.status = ev.get("status") or "unknown"
        watch.last_error = None
        # Refresh cached metadata in case venue/date changed
        if ev.get("event_name"):
            watch.event_name = ev["event_name"]
        if ev.get("event_url"):
            watch.event_url = ev["event_url"]
        if ev.get("image_url"):
            watch.image_url = ev["image_url"]
        if ev.get("venue"):
            watch.venue = ev["venue"]
        if ev.get("city"):
            watch.city = ev["city"]
        if ev.get("event_date"):
            watch.event_date = ev["event_date"]
    except ticketmaster.TicketmasterError as e:
        watch.last_error = str(e)[:500]
    except Exception as e:
        watch.last_error = f"Error inesperado: {e}"[:500]

    watch.last_checked = datetime.utcnow()
    watch.check_count += 1

    # Decide on notification
    notif = ticketmaster.notification_for_status_change(watch.last_notified_status, watch.status)
    if notif:
        title, body = notif
        url_path = f"/tickets"
        # Notify both members of the couple
        from app.models.user import User as UserModel
        members = session.exec(
            select(UserModel).where(UserModel.couple_id == watch.couple_id)
        ).all()
        body_with_event = f"{watch.event_name} — {body}"
        for m in members:
            try:
                send_push_to_user(m.id, title, body_with_event, url_path, session, tag=f"ticket-{watch.event_id}")
            except Exception:
                pass
        watch.last_notified_status = watch.status

    session.add(watch)
    session.commit()


# ── Background poller ──

_poll_task: Optional[asyncio.Task] = None
_poll_started = False


async def _poll_loop():
    """Periodically check every active watch. Runs forever."""
    log.info("ticket_watcher: starting poll loop (every %ss)", TICKETMASTER_POLL_SECONDS)
    while True:
        try:
            if TICKETMASTER_API_KEY:
                with Session(engine) as session:
                    watches = session.exec(
                        select(TicketWatch).where(TicketWatch.active == True)  # noqa: E712
                    ).all()
                    for w in watches:
                        try:
                            _check_watch(w, session)
                        except Exception:
                            log.exception("ticket_watcher: failed checking watch %s", w.id)
        except Exception:
            log.exception("ticket_watcher: poll loop error")
        await asyncio.sleep(TICKETMASTER_POLL_SECONDS)


def start_poller():
    """Start the background poller task. Safe to call multiple times."""
    global _poll_task, _poll_started
    if _poll_started:
        return
    try:
        loop = asyncio.get_event_loop()
        _poll_task = loop.create_task(_poll_loop())
        _poll_started = True
    except RuntimeError:
        # No running loop yet; caller should defer
        pass
