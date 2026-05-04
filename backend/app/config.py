import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_IMAGES_DIR = UPLOADS_DIR / "images"
UPLOADS_AUDIO_DIR = UPLOADS_DIR / "audio"

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./amory.db")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY env var is required. Generate one with: openssl rand -hex 32"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

# VAPID keys for Web Push notifications.
# Empty values are allowed — push notifications simply won't work.
# Generate a fresh keypair at https://vapidkeys.com or with `py_vapid` and set them via env.
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_EMAIL", "mailto:amory@example.com")

# Ticketmaster Discovery API
# Get a consumer key from https://developer.ticketmaster.com/
TICKETMASTER_API_KEY = os.getenv("TICKETMASTER_API_KEY", "")
TICKETMASTER_POLL_SECONDS = int(os.getenv("TICKETMASTER_POLL_SECONDS", "300"))  # 5 min
TICKETMASTER_COUNTRY = os.getenv("TICKETMASTER_COUNTRY", "")  # "" = búsqueda global
