<div align="center">

# amory

**A private, full-stack relationship tracker for couples.**
Built end-to-end as a passion project — backend, frontend, mobile shells, push notifications, deploy pipeline.

[![status](https://img.shields.io/badge/status-live-success?style=flat-square)](https://amory-love.com)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](#)
[![fastapi](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](#)
[![react](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](#)
[![vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](#)
[![postgres](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](#)
[![docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](#)
[![capacitor](https://img.shields.io/badge/Capacitor-iOS%20%26%20Android-119EFF?style=flat-square&logo=ionic&logoColor=white)](#)

</div>

---

## What it is

**amory** is a relationship companion app — a single space where a couple can keep their shared life: diaries, monthly photo journals, planned outings, books they're reading together, gifts and wishlists, mini-games for date nights, push reminders, and a Ticketmaster-powered upcoming-events feed. It runs as a PWA on the web and as a native shell on iOS and Android via Capacitor.

> Live at [amory-love.com](https://amory-love.com) (private, invite-only).

This is **the personal project that doubles as my engineering sandbox** — every layer was built from scratch: auth, push delivery, file uploads, deploy, mobile shells, the lot.

## Architecture

```
                   ┌──────────────────────────────────────┐
                   │  amory-love.com                      │
                   │  Caddy 2 (auto HTTPS via Let's Enc.) │
                   └──────────────┬───────────────────────┘
                                  │
                ┌─────────────────┴──────────────────┐
                ▼                                    ▼
   ┌────────────────────────┐         ┌────────────────────────┐
   │  frontend (Vite)       │         │  backend (FastAPI)     │
   │  React 18 + TypeScript │  ◄───►  │  Python 3.12 + JWT     │
   │  Capacitor (iOS/And.)  │         │  Web Push (VAPID)      │
   │  Spotify mini-player   │         │  Ticketmaster polling  │
   └────────────────────────┘         └──────────┬─────────────┘
                                                 │
                                                 ▼
                                       ┌──────────────────┐
                                       │  PostgreSQL 16   │
                                       │  (docker volume) │
                                       └──────────────────┘
```

All services live as containers in a single `docker compose` stack on a Hostinger VPS. Caddy handles TLS termination and reverse proxy; the backend is never exposed directly to the internet.

## Stack

| Layer | Tech |
| --- | --- |
| **Backend** | FastAPI · SQLAlchemy · Pydantic · python-jose (JWT) · passlib (bcrypt) · pywebpush (VAPID) · uvicorn |
| **Database** | PostgreSQL 16 (alpine) — relational tables for users, couples, diary entries, monthly content, outings, etc. |
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · React Router · Service Worker for push |
| **Mobile** | Capacitor — native shells for iOS (Xcode/SPM) and Android (Gradle) |
| **Infra** | Docker Compose · Caddy 2 (auto HTTPS) · Hostinger VPS (Ubuntu 24.04) |
| **External APIs** | Ticketmaster Discovery API (events feed), Spotify Web API (now-playing widget) |
| **Deploy** | Custom `paramiko`-based deploy script — packs the project, ships it via SFTP, builds remotely, runs `docker compose up -d` |

## Features

### Core
- **Auth** — email + password with JWT access tokens; password reset flow.
- **Couples** — invite-link pairing; both users see the same shared content.
- **Diary** — long-form entries with image attachments and mood tagging.
- **Monthly journal** — month-by-month photo grids with notes and highlights.
- **Outings** — plan, log, and remember dates; map preview; receipt photos.
- **Wishlist** — gifts, places, surprises; mark as done with a partner reaction.
- **Books** — shared reading list with progress bars and notes.
- **Tickets** — searches Ticketmaster by city/genre and pings push when matches appear.
- **Chat** — lightweight in-app messaging (not a chat replacement, just for context-pinned notes).

### Date-night extras
- **Minigames**: Truth or Dare, Bingo, Spinner, Countdown, Love Jar, Secret Letters, Who's Most Likely.
- **Calendar**, **Budget**, **Challenges**, **Dream board**, **Playlist** (Spotify), **Recipes**, **Timeline** — all under a unified "more" hub.

### Engagement
- **Web push notifications** via VAPID — daily memory replays, partner reactions, ticket alerts.
- **Gamification** — achievements, streaks, love-counter widget.
- **Easter eggs** — hidden book clue, animated love counter, particle/handwriting effects.

## Local development

```bash
# 0. Generate a SECRET_KEY for the backend
openssl rand -hex 32

# 1. Copy env template and fill in values
cp .env.example .env
# Required at minimum:
#   DOMAIN=localhost
#   DB_PASSWORD=<any string for local>
#   SECRET_KEY=<from step 0>
#   CORS_ORIGINS=http://localhost:5173

# 2. Bring up the full stack
docker compose up -d --build

# 3. Watch logs
docker compose logs -f backend
```

The frontend is served by Caddy at `http://localhost`. For frontend hot-reload during development, run it standalone:

```bash
cd frontend
npm install
npm run dev    # Vite at http://localhost:5173
```

## Project layout

```
amory/
├── backend/
│   ├── app/
│   │   ├── auth/         # JWT + dependencies
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── routes/       # FastAPI routers
│   │   ├── services/     # Ticketmaster client, push delivery
│   │   ├── data/         # Static seed data (quiz questions, etc.)
│   │   ├── config.py     # Env-driven settings
│   │   └── main.py
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # auth, effects, shared
│   │   ├── pages/        # home, minigames, more, tickets
│   │   ├── context/      # AuthContext, SpotifyContext
│   │   └── services/api.ts
│   ├── android/          # Capacitor — native Android shell
│   ├── ios/              # Capacitor — native iOS shell
│   └── Dockerfile        # nginx serving the Vite build
├── Caddyfile             # reverse proxy + auto TLS
├── docker-compose.yml
└── .env.example
```

## Security notes

- `.env` is gitignored. Never commit real secrets.
- `SECRET_KEY` is required at boot — the app refuses to start without it.
- VAPID keys live in env vars only; rotate them whenever a release leaves the inner circle.
- File uploads land outside the repo (Docker volume `backend-uploads`).
- All inter-container traffic stays on the internal Docker network; only Caddy is exposed on `:80/:443`.

## License

MIT — see [LICENSE](LICENSE).

---

<div align="center">

Built by [Camilo Acevedo](https://camiloacevedo.dev) · [github.com/camilo-acevedo](https://github.com/camilo-acevedo)

</div>
