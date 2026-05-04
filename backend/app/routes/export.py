import io
import json
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select, func
from fpdf import FPDF

from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User, Couple
from app.models.book import BookPage, PagePhoto, Comment, GuestBookEntry
from app.models.content import SharedSong, TimelineEvent, DreamItem, Recipe
from app.models.diary import DiaryEntry
from app.models.outing import Outing, OutingDocument, BucketListItem
from app.models.monthly import MonthlyActivity, MonthlyEntry, Streak
from app.models.wishlist import WishlistItem
from app.models.chat import ChatMessage
from app.models.social import DailyQuestion, DailyAnswer, ThinkingOfYou
from app.models.extras import (
    TimeCapsule, OpenWhenLetter, MemoryPin, CoupleXP, XPLog, LoveReason,
    Voucher, ScratchCard, BingoCell, EventCountdown,
)
from app.models.gamification import (
    Achievement, SharedCalendarEvent, WeeklyChallenge, DateExpense,
)
from app.config import UPLOADS_DIR

router = APIRouter(prefix="/export", tags=["export"])

MONTHS_ES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

# ── Color palette ──
BURNT = (180, 100, 65)
BURNT_LIGHT = (220, 190, 170)
BURNT_BG = (252, 245, 238)
WARM_DARK = (100, 80, 60)
WARM_MED = (140, 120, 100)
WARM_LIGHT = (180, 160, 140)
TEXT_DARK = (60, 50, 40)
TEXT_BODY = (80, 70, 60)
TEXT_MUTED = (150, 135, 120)
ACCENT_GREEN = (80, 140, 100)
ACCENT_BLUE = (80, 120, 160)
WHITE = (255, 255, 255)


def require_couple(user: User) -> int:
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="Debes pertenecer a una pareja")
    return user.couple_id


def _fmt_date(d) -> str:
    """Format a date object or YYYY-MM-DD string to readable Spanish."""
    if isinstance(d, str):
        parts = d.split("-")
        if len(parts) == 3:
            return f"{int(parts[2])} de {MONTHS_ES[int(parts[1])]} {parts[0]}"
        return d
    if hasattr(d, "strftime"):
        return f"{d.day} de {MONTHS_ES[d.month]} {d.year}"
    return str(d)


class AmoryPDF(FPDF):
    def __init__(self, couple_names: str, anniversary: str):
        super().__init__()
        self.couple_names = couple_names
        self.anniversary = anniversary
        self.set_auto_page_break(auto=True, margin=25)
        self._section_count = 0

    def header(self):
        if self.page_no() > 1:
            # Thin decorative line at top
            self.set_draw_color(*BURNT_LIGHT)
            self.set_line_width(0.3)
            self.line(self.l_margin, 8, self.w - self.r_margin, 8)
            # Header text
            self.set_y(10)
            self.set_font("Helvetica", "I", 7)
            self.set_text_color(*WARM_LIGHT)
            self.cell(0, 5, f"Amory  |  {self.couple_names}", align="C")
            self.ln(10)

    def footer(self):
        self.set_y(-18)
        # Decorative line
        self.set_draw_color(*BURNT_LIGHT)
        self.set_line_width(0.2)
        self.line(self.l_margin + 20, self.get_y(), self.w - self.r_margin - 20, self.get_y())
        self.ln(3)
        self.set_font("Helvetica", "I", 7)
        self.set_text_color(*WARM_LIGHT)
        self.cell(0, 5, str(self.page_no()), align="C")

    def _check_space(self, needed: float = 40):
        """Add new page if not enough space."""
        if self.get_y() > (self.h - self.b_margin - needed):
            self.add_page()

    def decorative_separator(self):
        """A small centered ornament between items."""
        y = self.get_y() + 2
        mid = self.w / 2
        self.set_draw_color(*BURNT_LIGHT)
        self.set_line_width(0.3)
        self.line(mid - 20, y, mid - 5, y)
        self.line(mid + 5, y, mid + 20, y)
        # Small diamond
        self.set_fill_color(*BURNT)
        s = 1.2
        self.polygon([(mid, y - s), (mid + s, y), (mid, y + s), (mid - s, y)], style="F")
        self.set_y(y + 5)

    def section_page(self, title: str, subtitle: str = ""):
        """Full page section divider — beautiful intro page for each section."""
        self.add_page()
        self._section_count += 1
        # Decorative top element
        self.ln(50)
        self.set_draw_color(*BURNT)
        self.set_line_width(0.5)
        mid = self.w / 2
        self.line(mid - 30, self.get_y(), mid + 30, self.get_y())
        self.ln(8)

        # Section number
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*WARM_MED)
        self.cell(0, 6, f"- {self._section_count} -", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

        # Title
        self.set_font("Helvetica", "B", 26)
        self.set_text_color(*BURNT)
        self.cell(0, 14, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

        if subtitle:
            self.set_font("Helvetica", "I", 11)
            self.set_text_color(*WARM_MED)
            self.multi_cell(0, 6, subtitle, align="C")
            self.ln(2)

        # Bottom ornament
        self.ln(6)
        self.line(mid - 30, self.get_y(), mid + 30, self.get_y())
        self.ln(10)

    def section_title(self, title: str):
        """Inline section title with decorative underline."""
        self._check_space(30)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*BURNT)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        # Gradient-style double line
        self.set_draw_color(*BURNT)
        self.set_line_width(0.6)
        self.line(self.l_margin, self.get_y(), self.l_margin + 40, self.get_y())
        self.set_draw_color(*BURNT_LIGHT)
        self.set_line_width(0.3)
        self.line(self.l_margin + 42, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(8)

    def sub_title(self, title: str):
        self._check_space(20)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*WARM_DARK)
        self.cell(0, 7, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text: str):
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*TEXT_BODY)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def small_text(self, text: str):
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*TEXT_MUTED)
        self.cell(0, 4.5, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def label_value(self, label: str, value: str):
        """Render a label: value pair on one line."""
        self._check_space(10)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*WARM_MED)
        lw = self.get_string_width(label + ": ") + 2
        self.cell(lw, 5.5, label + ": ")
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*TEXT_BODY)
        self.cell(0, 5.5, value, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def stat_box(self, label: str, value: str, x: float, y: float, w: float = 40, h: float = 22):
        """Render a small stat box at specific position."""
        self.set_fill_color(*BURNT_BG)
        self.set_draw_color(*BURNT_LIGHT)
        self.rect(x, y, w, h, style="DF")
        # Value
        self.set_xy(x, y + 3)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*BURNT)
        self.cell(w, 8, str(value), align="C")
        # Label
        self.set_xy(x, y + 12)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*WARM_MED)
        self.cell(w, 5, label, align="C")

    def card_start(self):
        """Draw a subtle card background."""
        self._check_space(35)
        y = self.get_y()
        self.set_fill_color(250, 247, 243)
        self.set_draw_color(*BURNT_LIGHT)
        return y

    def add_image_safe(self, photo_url: str, max_w: float = 80):
        """Try to add an image from uploads directory."""
        if not photo_url:
            return
        if photo_url.startswith("/uploads/"):
            rel = photo_url[len("/uploads/"):]
            file_path = str(UPLOADS_DIR / rel)
            if os.path.exists(file_path):
                try:
                    self._check_space(60)
                    x = (self.w - max_w) / 2
                    self.image(file_path, x=x, w=max_w)
                    self.ln(4)
                except Exception:
                    pass

    def polygon(self, points, style="D"):
        """Draw a polygon (for diamond ornaments)."""
        if len(points) < 3:
            return
        h = ""
        for i, (x, y) in enumerate(points):
            cmd = "m" if i == 0 else "l"
            h += f"{x * self.k:.2f} {(self.h - y) * self.k:.2f} {cmd} "
        h += "h "
        if style == "F":
            h += "f "
        elif style == "DF":
            h += "B "
        else:
            h += "S "
        self._out(h)


def _build_pdf(user: User, session: Session) -> bytes:
    couple_id = user.couple_id
    couple = session.get(Couple, couple_id)
    if not couple:
        raise HTTPException(status_code=404, detail="Pareja no encontrada")

    users = session.exec(select(User).where(User.couple_id == couple_id)).all()
    user_map = {u.id: u.name for u in users}
    names = [u.name for u in users]
    couple_names = " & ".join(names) if len(names) == 2 else names[0] if names else "Pareja"
    anniversary_str = _fmt_date(couple.anniversary_date) if couple.anniversary_date else ""

    pdf = AmoryPDF(couple_names, anniversary_str)

    # ═══════════════════════════════════════════
    # COVER PAGE
    # ═══════════════════════════════════════════
    pdf.add_page()

    # Couple photo at top if exists
    if couple.photo_url:
        pdf.ln(10)
        pdf.add_image_safe(couple.photo_url, max_w=70)
        pdf.ln(5)
    else:
        pdf.ln(35)

    # Decorative top line
    mid = pdf.w / 2
    pdf.set_draw_color(*BURNT)
    pdf.set_line_width(0.8)
    pdf.line(mid - 35, pdf.get_y(), mid + 35, pdf.get_y())
    pdf.ln(10)

    # App name
    pdf.set_font("Helvetica", "B", 38)
    pdf.set_text_color(*BURNT)
    pdf.cell(0, 18, "Amory", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Tagline
    pdf.set_font("Helvetica", "I", 13)
    pdf.set_text_color(*WARM_MED)
    pdf.cell(0, 8, "Nuestra Historia de Amor", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(12)

    # Couple names
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*WARM_DARK)
    pdf.cell(0, 12, couple_names, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    if anniversary_str:
        pdf.set_font("Helvetica", "I", 11)
        pdf.set_text_color(*WARM_MED)
        pdf.cell(0, 7, f"Juntos desde {anniversary_str}", align="C", new_x="LMARGIN", new_y="NEXT")

    if couple.anniversary_date:
        days = (datetime.utcnow() - couple.anniversary_date).days
        months = days // 30
        years = days // 365
        pdf.ln(8)
        pdf.set_font("Helvetica", "B", 15)
        pdf.set_text_color(*BURNT)
        parts = []
        if years > 0:
            parts.append(f"{years} {'ano' if years == 1 else 'anos'}")
        if months % 12 > 0:
            parts.append(f"{months % 12} {'mes' if months % 12 == 1 else 'meses'}")
        parts.append(f"{days} dias")
        pdf.cell(0, 10, " | ".join(parts), align="C", new_x="LMARGIN", new_y="NEXT")

    # Bottom ornament
    pdf.ln(15)
    pdf.set_draw_color(*BURNT)
    pdf.set_line_width(0.5)
    pdf.line(mid - 35, pdf.get_y(), mid + 35, pdf.get_y())
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*WARM_LIGHT)
    pdf.cell(0, 5, f"Generado el {datetime.utcnow().strftime('%d de %B de %Y')}", align="C", new_x="LMARGIN", new_y="NEXT")

    # ═══════════════════════════════════════════
    # TABLE OF CONTENTS — collect section counts first
    # ═══════════════════════════════════════════
    # We'll build the PDF section by section, each only if data exists

    # ═══════════════════════════════════════════
    # 1. NUESTRO LIBRO
    # ═══════════════════════════════════════════
    pages = session.exec(
        select(BookPage).where(BookPage.couple_id == couple_id, BookPage.page_type == "inner")
        .order_by(BookPage.order)
    ).all()

    if pages:
        pdf.section_page("Nuestro Libro", "Las paginas de nuestra historia juntos")
        for page in pages:
            pdf._check_space(50)
            if page.title:
                pdf.sub_title(page.title)
            if page.photo_url:
                pdf.add_image_safe(page.photo_url, max_w=100)
            frame_photos = session.exec(
                select(PagePhoto).where(PagePhoto.page_id == page.id).order_by(PagePhoto.frame_index)
            ).all()
            for fp in frame_photos:
                pdf.add_image_safe(fp.photo_url, max_w=70)
                if fp.caption:
                    pdf.small_text(fp.caption)
                if fp.place_name:
                    pdf.small_text(f"Lugar: {fp.place_name}")
            if page.text:
                pdf.body_text(page.text)
            # Page comments
            comments = session.exec(
                select(Comment).where(Comment.page_id == page.id).order_by(Comment.created_at)
            ).all()
            if comments:
                for c in comments:
                    cname = user_map.get(c.user_id, "?")
                    pdf.small_text(f'{cname}: "{c.content}"')
            pdf.ln(3)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 2. LINEA DEL TIEMPO
    # ═══════════════════════════════════════════
    timeline = session.exec(
        select(TimelineEvent).where(TimelineEvent.couple_id == couple_id)
        .order_by(TimelineEvent.event_date.asc())
    ).all()

    if timeline:
        pdf.section_page("Linea del Tiempo", "Los momentos que nos han definido")
        for ev in timeline:
            pdf._check_space(40)
            date_label = _fmt_date(ev.event_date)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*BURNT)
            pdf.cell(0, 6, date_label, new_x="LMARGIN", new_y="NEXT")
            pdf.sub_title(ev.title)
            if ev.description:
                pdf.body_text(ev.description)
            if ev.photo_url:
                pdf.add_image_safe(ev.photo_url, max_w=85)
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 3. DIARIO DE PAREJA
    # ═══════════════════════════════════════════
    diary = session.exec(
        select(DiaryEntry).where(DiaryEntry.couple_id == couple_id)
        .order_by(DiaryEntry.created_at.asc())
    ).all()

    if diary:
        pdf.section_page("Diario de Pareja", f"{len(diary)} momentos escritos desde el corazon")
        for entry in diary:
            pdf._check_space(35)
            author_name = user_map.get(entry.user_id, "?")
            date_str = entry.created_at.strftime("%d/%m/%Y")
            mood = f"  {entry.mood}" if entry.mood else ""
            # Date pill
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*BURNT)
            pdf.cell(0, 5, f"{date_str}{mood}", new_x="LMARGIN", new_y="NEXT")
            # Author
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*WARM_DARK)
            pdf.cell(0, 6, author_name, new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
            # Content
            pdf.body_text(entry.content[:800])
            if entry.photo_url:
                pdf.add_image_safe(entry.photo_url, max_w=75)
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 4. SALIDAS Y AVENTURAS
    # ═══════════════════════════════════════════
    outings = session.exec(
        select(Outing).where(Outing.couple_id == couple_id)
        .order_by(Outing.created_at.asc())
    ).all()

    if outings:
        completed = [o for o in outings if o.status in ("completed", "documented")]
        pending = [o for o in outings if o.status not in ("completed", "documented")]
        pdf.section_page("Salidas y Aventuras", f"{len(completed)} completadas | {len(pending)} por vivir")

        if completed:
            pdf.section_title("Aventuras vividas")
            for o in completed:
                pdf._check_space(40)
                pdf.sub_title(o.title)
                if o.place:
                    pdf.label_value("Lugar", o.place)
                if o.description:
                    pdf.body_text(o.description)
                if o.completed_at:
                    pdf.small_text(f"Completada el {o.completed_at.strftime('%d/%m/%Y')}")
                # Documents/photos
                docs = session.exec(
                    select(OutingDocument).where(OutingDocument.outing_id == o.id)
                ).all()
                for doc in docs:
                    if doc.photo_url:
                        pdf.add_image_safe(doc.photo_url, max_w=75)
                    if doc.description:
                        pdf.small_text(doc.description[:200])
                pdf.ln(2)
                pdf.decorative_separator()

        if pending:
            pdf.section_title("Proximas aventuras")
            for o in pending:
                pdf._check_space(20)
                pdf.sub_title(o.title)
                if o.place:
                    pdf.label_value("Lugar", o.place)
                if o.proposed_date:
                    pdf.label_value("Fecha propuesta", o.proposed_date.strftime("%d/%m/%Y"))
                if o.description:
                    pdf.body_text(o.description)
                pdf.ln(2)

    # ═══════════════════════════════════════════
    # 5. ACTIVIDADES MENSUALES
    # ═══════════════════════════════════════════
    monthly = session.exec(
        select(MonthlyActivity).where(MonthlyActivity.couple_id == couple_id)
        .order_by(MonthlyActivity.year, MonthlyActivity.month)
    ).all()

    if monthly:
        done = [m for m in monthly if m.status == "completed"]
        pdf.section_page("Actividades Mensuales", f"{len(done)} de {len(monthly)} completadas")
        for act in monthly:
            pdf._check_space(35)
            month_name = MONTHS_ES[act.month] if 1 <= act.month <= 12 else str(act.month)
            status_icon = "[completada]" if act.status == "completed" else "[pendiente]"
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*BURNT if act.status == "completed" else TEXT_MUTED)
            pdf.cell(0, 5, f"{month_name} {act.year}  {status_icon}", new_x="LMARGIN", new_y="NEXT")
            pdf.sub_title(act.title)
            if act.description:
                pdf.body_text(act.description)
            # Entries (photos and feelings)
            entries = session.exec(
                select(MonthlyEntry).where(MonthlyEntry.activity_id == act.id)
            ).all()
            for ent in entries:
                ename = user_map.get(ent.user_id, "?")
                if ent.photo_url:
                    pdf.add_image_safe(ent.photo_url, max_w=70)
                if ent.feeling_text:
                    pdf.small_text(f'{ename}: "{ent.feeling_text[:200]}"')
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 6. LISTA DE DESEOS
    # ═══════════════════════════════════════════
    wishlist = session.exec(
        select(WishlistItem).where(WishlistItem.couple_id == couple_id)
        .order_by(WishlistItem.created_at.asc())
    ).all()

    if wishlist:
        done_w = [w for w in wishlist if w.completed]
        pending_w = [w for w in wishlist if not w.completed]
        pdf.section_page("Lista de Deseos", f"{len(done_w)} cumplidos | {len(pending_w)} por cumplir")

        cat_names = {
            "place": "Lugares", "restaurant": "Restaurantes", "movie": "Peliculas",
            "gift": "Regalos", "experience": "Experiencias",
        }

        if done_w:
            pdf.section_title("Deseos cumplidos")
            for w in done_w:
                pdf._check_space(20)
                cat = cat_names.get(w.category, w.category)
                stars = ("*" * w.rating) if w.rating else ""
                pdf.sub_title(f"{w.title}  {stars}")
                pdf.small_text(f"Categoria: {cat}")
                if w.review:
                    pdf.body_text(f'"{w.review}"')
                if w.image_url:
                    pdf.add_image_safe(w.image_url, max_w=65)
                pdf.ln(1)

        if pending_w:
            pdf.section_title("Deseos pendientes")
            for w in pending_w:
                pdf._check_space(15)
                cat = cat_names.get(w.category, w.category)
                pdf.set_font("Helvetica", "", 9.5)
                pdf.set_text_color(*TEXT_BODY)
                pdf.cell(0, 5.5, f"- {w.title}  ({cat})", new_x="LMARGIN", new_y="NEXT")
                if w.description:
                    pdf.small_text(f"  {w.description[:100]}")

    # ═══════════════════════════════════════════
    # 7. BUCKET LIST
    # ═══════════════════════════════════════════
    bucket = session.exec(
        select(BucketListItem).where(BucketListItem.couple_id == couple_id)
        .order_by(BucketListItem.created_at.asc())
    ).all()

    if bucket:
        done_b = [b for b in bucket if b.completed]
        pending_b = [b for b in bucket if not b.completed]
        pdf.section_page("Bucket List", f"{len(done_b)} logrados de {len(bucket)}")

        for b in bucket:
            pdf._check_space(15)
            check = "[x]" if b.completed else "[ ]"
            pdf.set_font("Helvetica", "B" if b.completed else "", 9.5)
            pdf.set_text_color(*ACCENT_GREEN if b.completed else TEXT_BODY)
            pdf.cell(0, 5.5, f"{check}  {b.title}", new_x="LMARGIN", new_y="NEXT")
            if b.description:
                pdf.small_text(f"    {b.description[:150]}")
            pdf.ln(1)

    # ═══════════════════════════════════════════
    # 8. NUESTRA PLAYLIST
    # ═══════════════════════════════════════════
    songs = session.exec(
        select(SharedSong).where(SharedSong.couple_id == couple_id)
        .order_by(SharedSong.created_at.asc())
    ).all()

    if songs:
        pdf.section_page("Nuestra Playlist", f"{len(songs)} canciones que nos representan")
        for i, song in enumerate(songs, 1):
            pdf._check_space(15)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*WARM_DARK)
            pdf.cell(0, 6, f"{i:02d}.  {song.title}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "I", 9)
            pdf.set_text_color(*TEXT_MUTED)
            pdf.cell(0, 5, f"      {song.artist}", new_x="LMARGIN", new_y="NEXT")
            if song.note:
                pdf.set_font("Helvetica", "I", 8)
                pdf.set_text_color(*BURNT)
                pdf.cell(0, 5, f'      "{song.note}"', new_x="LMARGIN", new_y="NEXT")
            pdf.ln(2)

    # ═══════════════════════════════════════════
    # 9. TABLERO DE SUENOS
    # ═══════════════════════════════════════════
    dreams = session.exec(
        select(DreamItem).where(DreamItem.couple_id == couple_id)
        .order_by(DreamItem.created_at.asc())
    ).all()

    if dreams:
        done_d = [d for d in dreams if d.completed]
        pending_d = [d for d in dreams if not d.completed]
        pdf.section_page("Tablero de Suenos", f"{len(done_d)} cumplidos | {len(pending_d)} por cumplir")

        cat_dream = {
            "travel": "Viajes", "home": "Hogar", "experiences": "Experiencias",
            "personal": "Personal", "general": "General",
        }

        if done_d:
            pdf.section_title("Suenos cumplidos")
            for d in done_d:
                pdf._check_space(15)
                cat = cat_dream.get(d.category, d.category)
                pdf.set_font("Helvetica", "B", 9.5)
                pdf.set_text_color(*ACCENT_GREEN)
                pdf.cell(0, 5.5, f"[x]  {d.title}  ({cat})", new_x="LMARGIN", new_y="NEXT")
                if d.description:
                    pdf.small_text(f"     {d.description[:150]}")

        if pending_d:
            pdf.section_title("Suenos pendientes")
            for d in pending_d:
                pdf._check_space(15)
                cat = cat_dream.get(d.category, d.category)
                pdf.set_font("Helvetica", "", 9.5)
                pdf.set_text_color(*TEXT_BODY)
                pdf.cell(0, 5.5, f"[ ]  {d.title}  ({cat})", new_x="LMARGIN", new_y="NEXT")
                if d.description:
                    pdf.small_text(f"     {d.description[:150]}")

    # ═══════════════════════════════════════════
    # 10. RECETAS
    # ═══════════════════════════════════════════
    recipes = session.exec(
        select(Recipe).where(Recipe.couple_id == couple_id)
        .order_by(Recipe.created_at.asc())
    ).all()

    if recipes:
        pdf.section_page("Nuestras Recetas", f"{len(recipes)} recetas guardadas")
        for r in recipes:
            pdf._check_space(40)
            stars = ("*" * r.rating) if r.rating else ""
            cooked_label = "  [Cocinada]" if r.cooked else ""
            pdf.sub_title(f"{r.title}  {stars}{cooked_label}")
            if r.description:
                pdf.body_text(r.description)
            if r.ingredients:
                try:
                    ingr = json.loads(r.ingredients) if isinstance(r.ingredients, str) else r.ingredients
                    if isinstance(ingr, list):
                        pdf.label_value("Ingredientes", ", ".join(ingr))
                except Exception:
                    pdf.label_value("Ingredientes", str(r.ingredients)[:200])
            if r.instructions:
                pdf.body_text(r.instructions[:500])
            if r.photo_url:
                pdf.add_image_safe(r.photo_url, max_w=70)
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 11. MAPA DE RECUERDOS
    # ═══════════════════════════════════════════
    pins = session.exec(
        select(MemoryPin).where(MemoryPin.couple_id == couple_id)
        .order_by(MemoryPin.created_at.asc())
    ).all()

    if pins:
        pdf.section_page("Mapa de Recuerdos", f"{len(pins)} lugares especiales marcados")
        for pin in pins:
            pdf._check_space(35)
            pdf.sub_title(pin.title)
            if pin.description:
                pdf.body_text(pin.description)
            if pin.visited_at:
                pdf.small_text(f"Visitado el {pin.visited_at.strftime('%d/%m/%Y')}")
            pdf.small_text(f"Coordenadas: {pin.latitude:.4f}, {pin.longitude:.4f}")
            if pin.photo_url:
                pdf.add_image_safe(pin.photo_url, max_w=70)
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 12. RAZONES PARA AMARTE
    # ═══════════════════════════════════════════
    reasons = session.exec(
        select(LoveReason).where(LoveReason.couple_id == couple_id)
        .order_by(LoveReason.created_at.asc())
    ).all()

    if reasons:
        pdf.section_page("Razones para Amarte", f"{len(reasons)} razones escritas")
        for i, r in enumerate(reasons, 1):
            pdf._check_space(15)
            author = user_map.get(r.author_id, "?")
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(*BURNT)
            pdf.cell(0, 6, f"{i}. \"{r.text}\"", new_x="LMARGIN", new_y="NEXT")
            pdf.small_text(f"    - {author}")
            pdf.ln(2)

    # ═══════════════════════════════════════════
    # 13. CARTAS "ABRE CUANDO..."
    # ═══════════════════════════════════════════
    letters = session.exec(
        select(OpenWhenLetter).where(OpenWhenLetter.couple_id == couple_id)
        .order_by(OpenWhenLetter.created_at.asc())
    ).all()

    if letters:
        cat_letter = {
            "happy": "estas feliz", "sad": "estas triste", "stressed": "estas estresado/a",
            "angry": "estas enojado/a", "missing": "me extranas", "grateful": "estas agradecido/a",
            "bored": "estas aburrido/a", "scared": "tienes miedo", "lonely": "te sientes solo/a",
            "proud": "estas orgulloso/a",
        }
        opened = [l for l in letters if l.opened_at]
        pdf.section_page("Cartas: Abre cuando...", f"{len(opened)} abiertas de {len(letters)}")
        for letter in letters:
            pdf._check_space(30)
            cat = cat_letter.get(letter.category, letter.category)
            status = "[Abierta]" if letter.opened_at else "[Sin abrir]"
            author = user_map.get(letter.author_id, "?")
            pdf.sub_title(f"Abre cuando {cat}  {status}")
            pdf.small_text(f"De: {author}")
            if letter.opened_at:
                pdf.body_text(letter.content[:500])
            else:
                pdf.set_font("Helvetica", "I", 9)
                pdf.set_text_color(*TEXT_MUTED)
                pdf.cell(0, 5, "Contenido oculto hasta que se abra", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(2)
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 14. CAPSULAS DEL TIEMPO
    # ═══════════════════════════════════════════
    capsules = session.exec(
        select(TimeCapsule).where(TimeCapsule.couple_id == couple_id)
        .order_by(TimeCapsule.opens_at.asc())
    ).all()

    if capsules:
        pdf.section_page("Capsulas del Tiempo", f"{len(capsules)} capsulas creadas")
        for cap in capsules:
            pdf._check_space(30)
            author = user_map.get(cap.author_id, "?")
            status = "[Abierta]" if cap.opened else f"[Se abre el {cap.opens_at.strftime('%d/%m/%Y')}]"
            pdf.sub_title(f"{cap.title}  {status}")
            pdf.small_text(f"Creada por {author} el {cap.created_at.strftime('%d/%m/%Y')}")
            if cap.opened and cap.message:
                pdf.body_text(cap.message[:500])
            if cap.opened and cap.photo_url:
                pdf.add_image_safe(cap.photo_url, max_w=70)
            pdf.ln(2)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 15. PREGUNTAS DIARIAS
    # ═══════════════════════════════════════════
    questions = session.exec(
        select(DailyQuestion).where(DailyQuestion.couple_id == couple_id)
        .order_by(DailyQuestion.date.asc())
    ).all()

    if questions:
        answered_count = 0
        for q in questions:
            answers = session.exec(
                select(DailyAnswer).where(DailyAnswer.question_id == q.id)
            ).all()
            if len(answers) >= 2:
                answered_count += 1

        pdf.section_page("Preguntas Diarias", f"{answered_count} respondidas por ambos de {len(questions)}")
        for q in questions:
            answers = session.exec(
                select(DailyAnswer).where(DailyAnswer.question_id == q.id)
                .order_by(DailyAnswer.created_at)
            ).all()
            if not answers:
                continue
            pdf._check_space(30)
            pdf.set_font("Helvetica", "B", 9.5)
            pdf.set_text_color(*BURNT)
            pdf.cell(0, 6, f"{_fmt_date(q.date)}", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*WARM_DARK)
            pdf.cell(0, 6, q.question_text[:200], new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)
            for a in answers:
                aname = user_map.get(a.user_id, "?")
                pdf.set_font("Helvetica", "I", 9)
                pdf.set_text_color(*TEXT_MUTED)
                pdf.cell(0, 5, f"  {aname}:", new_x="LMARGIN", new_y="NEXT")
                pdf.body_text(f"  {a.answer_text[:300]}")
            pdf.ln(1)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 16. CALENDARIO DE PAREJA
    # ═══════════════════════════════════════════
    events = session.exec(
        select(SharedCalendarEvent).where(SharedCalendarEvent.couple_id == couple_id)
        .order_by(SharedCalendarEvent.event_date.asc())
    ).all()

    if events:
        pdf.section_page("Calendario de Pareja", f"{len(events)} eventos especiales")
        for ev in events:
            pdf._check_space(15)
            date_label = _fmt_date(ev.event_date)
            time_str = f" a las {ev.event_time}" if ev.event_time else ""
            recurring_str = f"  (se repite {ev.recurring})" if ev.recurring else ""
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*BURNT)
            pdf.cell(0, 5, f"{date_label}{time_str}{recurring_str}", new_x="LMARGIN", new_y="NEXT")
            pdf.sub_title(ev.title)
            if ev.description:
                pdf.body_text(ev.description)
            pdf.ln(1)

    # ═══════════════════════════════════════════
    # 17. VALES Y RASPADITAS
    # ═══════════════════════════════════════════
    vouchers = session.exec(
        select(Voucher).where(Voucher.couple_id == couple_id)
        .order_by(Voucher.created_at.asc())
    ).all()
    scratches = session.exec(
        select(ScratchCard).where(ScratchCard.couple_id == couple_id)
        .order_by(ScratchCard.created_at.asc())
    ).all()

    if vouchers or scratches:
        pdf.section_page("Vales y Raspaditas", "Sorpresas especiales entre nosotros")

        if vouchers:
            pdf.section_title("Vales de Amor")
            for v in vouchers:
                pdf._check_space(20)
                redeemed = "[Canjeado]" if v.redeemed_at else "[Disponible]"
                pdf.sub_title(f"{v.title}  {redeemed}")
                if v.description:
                    pdf.body_text(v.description)
                pdf.ln(1)

        if scratches:
            pdf.section_title("Raspaditas")
            for s in scratches:
                pdf._check_space(20)
                scratched = "[Raspada]" if s.scratched_at else "[Sin raspar]"
                pdf.sub_title(f"{s.title}  {scratched}")
                if s.scratched_at:
                    pdf.body_text(f'Mensaje oculto: "{s.hidden_message}"')
                pdf.ln(1)

    # ═══════════════════════════════════════════
    # 18. RETOS SEMANALES
    # ═══════════════════════════════════════════
    challenges = session.exec(
        select(WeeklyChallenge).where(WeeklyChallenge.couple_id == couple_id)
        .order_by(WeeklyChallenge.week_start.asc())
    ).all()

    if challenges:
        completed_ch = [c for c in challenges if c.status == "completed"]
        pdf.section_page("Retos Semanales", f"{len(completed_ch)} completados de {len(challenges)}")
        for ch in challenges:
            pdf._check_space(15)
            status = "[completado]" if ch.status == "completed" else "[pendiente]"
            pdf.set_font("Helvetica", "B" if ch.status == "completed" else "", 9.5)
            pdf.set_text_color(*ACCENT_GREEN if ch.status == "completed" else TEXT_BODY)
            pdf.cell(0, 5.5, f"{status}  {ch.title}", new_x="LMARGIN", new_y="NEXT")
            if ch.description:
                pdf.small_text(f"    {ch.description[:150]}")
            pdf.ln(1)

    # ═══════════════════════════════════════════
    # 19. LIBRO DE VISITAS
    # ═══════════════════════════════════════════
    guestbook = session.exec(
        select(GuestBookEntry).where(GuestBookEntry.couple_id == couple_id)
        .order_by(GuestBookEntry.created_at.asc())
    ).all()

    if guestbook:
        pdf.section_page("Libro de Visitas", f"{len(guestbook)} mensajes de personas especiales")
        for gb in guestbook:
            pdf._check_space(25)
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(*WARM_DARK)
            pdf.cell(0, 6, gb.author_name, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(*TEXT_BODY)
            pdf.multi_cell(0, 5.5, f'"{gb.message}"')
            pdf.small_text(gb.created_at.strftime("%d/%m/%Y"))
            pdf.ln(3)
            pdf.decorative_separator()

    # ═══════════════════════════════════════════
    # 20. CHAT — MENSAJES FIJADOS
    # ═══════════════════════════════════════════
    pinned_msgs = session.exec(
        select(ChatMessage).where(ChatMessage.couple_id == couple_id, ChatMessage.pinned == True)
        .order_by(ChatMessage.created_at.asc())
    ).all()

    if pinned_msgs:
        pdf.section_page("Mensajes Fijados", f"{len(pinned_msgs)} mensajes que guardamos")
        for msg in pinned_msgs:
            pdf._check_space(15)
            sender = user_map.get(msg.sender_id, "?")
            date_str = msg.created_at.strftime("%d/%m/%Y %H:%M")
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_text_color(*BURNT)
            pdf.cell(0, 5, f"{sender}  -  {date_str}", new_x="LMARGIN", new_y="NEXT")
            if msg.text:
                pdf.body_text(msg.text[:300])
            if msg.image_url:
                pdf.add_image_safe(msg.image_url, max_w=65)
            pdf.ln(2)

    # ═══════════════════════════════════════════
    # 21. LOGROS Y ESTADISTICAS
    # ═══════════════════════════════════════════
    xp_record = session.exec(
        select(CoupleXP).where(CoupleXP.couple_id == couple_id)
    ).first()
    achievements = session.exec(
        select(Achievement).where(Achievement.couple_id == couple_id)
        .order_by(Achievement.created_at.asc())
    ).all()
    streak = session.exec(
        select(Streak).where(Streak.couple_id == couple_id)
    ).first()

    # Always show stats page
    pdf.section_page("Logros y Estadisticas", "Nuestro progreso como pareja")

    # Stat counts
    diary_count = session.exec(
        select(func.count()).select_from(DiaryEntry).where(DiaryEntry.couple_id == couple_id)
    ).one()
    chat_count = session.exec(
        select(func.count()).select_from(ChatMessage).where(ChatMessage.couple_id == couple_id)
    ).one()
    outing_count = len([o for o in outings if o.status in ("completed", "documented")]) if outings else 0

    # XP and level
    if xp_record:
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(*BURNT)
        pdf.cell(0, 8, f"Nivel {xp_record.level}  |  {xp_record.total_xp} XP", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(8)

    # Stats grid
    pdf.section_title("Nuestros numeros")
    stats = [
        ("Dias juntos", str((datetime.utcnow() - couple.anniversary_date).days) if couple.anniversary_date else "?"),
        ("Entradas de diario", str(diary_count)),
        ("Mensajes de chat", str(chat_count)),
        ("Canciones", str(len(songs) if songs else 0)),
        ("Aventuras vividas", str(outing_count)),
        ("Lugares en el mapa", str(len(pins) if pins else 0)),
        ("Suenos guardados", str(len(dreams) if dreams else 0)),
        ("Momentos en timeline", str(len(timeline) if timeline else 0)),
    ]

    for label, value in stats:
        pdf.label_value(label, value)

    if streak:
        pdf.ln(4)
        pdf.label_value("Racha actual", f"{streak.current_streak} meses")
        pdf.label_value("Mejor racha", f"{streak.best_streak} meses")

    # Achievements
    unlocked = [a for a in achievements if a.unlocked_at]
    if unlocked:
        pdf.ln(6)
        pdf.section_title(f"Logros desbloqueados ({len(unlocked)})")
        for a in unlocked:
            pdf._check_space(15)
            pdf.set_font("Helvetica", "B", 9.5)
            pdf.set_text_color(*ACCENT_GREEN)
            pdf.cell(0, 5.5, f"[*]  {a.title}", new_x="LMARGIN", new_y="NEXT")
            if a.description:
                pdf.small_text(f"     {a.description[:150]}")
            pdf.ln(1)

    locked = [a for a in achievements if not a.unlocked_at]
    if locked:
        pdf.ln(4)
        pdf.section_title(f"Logros por desbloquear ({len(locked)})")
        for a in locked:
            pdf._check_space(12)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*TEXT_MUTED)
            pdf.cell(0, 5, f"[ ]  {a.title} - {a.description[:80]}", new_x="LMARGIN", new_y="NEXT")
            pdf.ln(1)

    # ═══════════════════════════════════════════
    # BACK COVER
    # ═══════════════════════════════════════════
    pdf.add_page()
    pdf.ln(50)

    # Decorative line
    mid = pdf.w / 2
    pdf.set_draw_color(*BURNT)
    pdf.set_line_width(0.5)
    pdf.line(mid - 30, pdf.get_y(), mid + 30, pdf.get_y())
    pdf.ln(12)

    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*BURNT)
    pdf.cell(0, 14, "Hecho con amor", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    pdf.set_font("Helvetica", "I", 14)
    pdf.set_text_color(*WARM_MED)
    pdf.cell(0, 8, couple_names, align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    if anniversary_str:
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*WARM_LIGHT)
        pdf.cell(0, 6, f"Desde {anniversary_str}", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(20)

    # Quote
    pdf.set_font("Helvetica", "I", 11)
    pdf.set_text_color(*WARM_MED)
    pdf.cell(0, 7, '"El amor no se mira, se siente,', align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, 'y aun mas cuando ella esta junto a ti."', align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(25)
    pdf.set_draw_color(*BURNT)
    pdf.set_line_width(0.3)
    pdf.line(mid - 20, pdf.get_y(), mid + 20, pdf.get_y())
    pdf.ln(6)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*WARM_LIGHT)
    pdf.cell(0, 5, "Generado por Amory App", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 5, datetime.utcnow().strftime("%d/%m/%Y"), align="C", new_x="LMARGIN", new_y="NEXT")

    return pdf.output()


@router.get("/pdf")
def export_pdf(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    couple_id = require_couple(user)
    pdf_bytes = _build_pdf(user, session)

    filename = f"amory_{couple_id}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
