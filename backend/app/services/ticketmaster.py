"""Ticketmaster Discovery API client and status mapping."""
import json
import urllib.parse
import urllib.request
from typing import Optional

from app.config import TICKETMASTER_API_KEY, TICKETMASTER_COUNTRY

DISCOVERY_BASE = "https://app.ticketmaster.com/discovery/v2"


class TicketmasterError(Exception):
    pass


def _request(path: str, params: dict, timeout: int = 15) -> dict:
    if not TICKETMASTER_API_KEY:
        raise TicketmasterError("TICKETMASTER_API_KEY no está configurada")
    params = {**params, "apikey": TICKETMASTER_API_KEY}
    url = f"{DISCOVERY_BASE}{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Amory/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        try:
            msg = e.read().decode("utf-8")[:200]
        except Exception:
            msg = str(e)
        raise TicketmasterError(f"HTTP {e.code}: {msg}") from e
    except Exception as e:
        raise TicketmasterError(f"Error de red: {e}") from e


def _parse_event(ev: dict) -> dict:
    """Normalize a Ticketmaster event payload into our shape."""
    images = ev.get("images") or []
    image_url = None
    if images:
        # Prefer 16:9 ~640 width
        ranked = sorted(images, key=lambda i: abs((i.get("width") or 0) - 640))
        image_url = ranked[0].get("url")

    venue_name = None
    city = None
    embedded_venues = (ev.get("_embedded") or {}).get("venues") or []
    if embedded_venues:
        v = embedded_venues[0]
        venue_name = v.get("name")
        city = (v.get("city") or {}).get("name")

    dates = ev.get("dates") or {}
    start = dates.get("start") or {}
    event_date = start.get("dateTime") or start.get("localDate")

    status_code = ((dates.get("status") or {}).get("code") or "unknown").lower()

    return {
        "event_id": ev.get("id", ""),
        "event_name": ev.get("name", ""),
        "event_url": ev.get("url"),
        "image_url": image_url,
        "venue": venue_name,
        "city": city,
        "event_date": event_date,
        "status": status_code,
    }


def search_events(
    keyword: str,
    country_code: Optional[str] = None,
    city: Optional[str] = None,
    size: int = 20,
) -> list[dict]:
    """Search the Discovery API by keyword. Returns normalized events.

    country_code semantics:
      - None     -> fallback to TICKETMASTER_COUNTRY default (or global if empty)
      - ""       -> explicit global search (no countryCode filter)
      - "XX"     -> restrict to that country (ISO-2)
    city: case-insensitive partial match on the venue city.
    """
    params = {
        "keyword": keyword,
        "size": size,
        "locale": "*",
    }
    if country_code is None:
        if TICKETMASTER_COUNTRY:
            params["countryCode"] = TICKETMASTER_COUNTRY
    elif country_code:
        params["countryCode"] = country_code
    if city:
        params["city"] = city
    data = _request("/events.json", params)
    events = ((data or {}).get("_embedded") or {}).get("events") or []
    return [_parse_event(e) for e in events]


def get_event(event_id: str) -> dict:
    """Fetch a single event by Discovery ID. Returns normalized event."""
    data = _request(f"/events/{event_id}.json", {"locale": "*"})
    return _parse_event(data)


def is_available(status: str) -> bool:
    """Return True if the status code means tickets can likely be purchased."""
    return status.lower() == "onsale"


def notification_for_status_change(previous: Optional[str], current: str) -> Optional[tuple[str, str]]:
    """
    Decide whether a status change warrants a push notification.
    Returns (title, body) or None if no notification should be sent.
    """
    prev = (previous or "").lower()
    curr = (current or "").lower()
    if prev == curr:
        return None

    if curr == "onsale":
        return ("¡Boletas disponibles!", "Ya hay boletas a la venta — corre a comprarlas.")
    if curr == "offsale" and prev == "onsale":
        return ("Ventas cerradas", "Las boletas ya no están disponibles.")
    if curr == "cancelled":
        return ("Evento cancelado", "Ticketmaster marcó el evento como cancelado.")
    if curr == "rescheduled":
        return ("Evento reprogramado", "La fecha del evento cambió, revisa los detalles.")
    if curr == "postponed":
        return ("Evento pospuesto", "El evento fue pospuesto.")
    return None
