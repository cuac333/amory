from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import CORS_ORIGINS, UPLOADS_DIR
from app.database import create_db_and_tables
from app.routes import auth, book, secret, monthly, outings, wishlist, diary, extras, deletion, social, content, gamification, chat, notification, summary, export, ticket

app = FastAPI(
    title="Amory API",
    description="API para la app de aniversario - Libro virtual de pareja",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# Routes
app.include_router(auth.router)
app.include_router(book.router)
app.include_router(secret.router)
app.include_router(monthly.router)
app.include_router(outings.router)
app.include_router(wishlist.router)
app.include_router(diary.router)
app.include_router(extras.router)
app.include_router(deletion.router)
app.include_router(social.router)
app.include_router(content.router)
app.include_router(gamification.router)
app.include_router(chat.router)
app.include_router(notification.router)
app.include_router(summary.router)
app.include_router(export.router)
app.include_router(ticket.router)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    ticket.start_poller()


@app.get("/")
def root():
    return {"message": "Amory API - Feliz Aniversario! 💕"}
