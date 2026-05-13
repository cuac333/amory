import json
import shutil
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import Session, select
from app.database import get_session
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.content import SharedSong, Recipe, TimelineEvent, DreamItem
from app.schemas.content import (
    SharedSongCreate, SharedSongResponse,
    RecipeCreate, RecipeUpdate, RecipeResponse,
    TimelineEventCreate, TimelineEventResponse,
    DreamItemCreate, DreamItemResponse,
)
from app.config import UPLOADS_IMAGES_DIR
from app.routes.extras import award_xp

router = APIRouter(tags=["content"])


def require_couple(user: User) -> int:
    if not user.couple_id:
        raise HTTPException(status_code=400, detail="你需要属于一个情侣才能使用此功能。")
    return user.couple_id


# ──────────────────────────────────────────────
# Shared Playlist
# ──────────────────────────────────────────────

@router.get("/playlist", response_model=list[SharedSongResponse])
def list_songs(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    stmt = (
        select(SharedSong)
        .where(SharedSong.couple_id == couple_id)
        .order_by(SharedSong.created_at.desc())
    )
    return session.exec(stmt).all()


@router.post("/playlist", response_model=SharedSongResponse, status_code=201)
def add_song(
    data: SharedSongCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    song = SharedSong(
        couple_id=couple_id,
        added_by=user.id,
        title=data.title,
        artist=data.artist,
        song_url=data.song_url,
        note=data.note,
    )
    session.add(song)
    session.commit()
    session.refresh(song)
    try:
        award_xp(couple_id, user.id, "song_added", 3, session)
    except Exception:
        pass
    return song


@router.delete("/playlist/{song_id}", status_code=204)
def delete_song(
    song_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    song = session.get(SharedSong, song_id)
    if not song or song.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="歌曲未找到。")
    if song.added_by != user.id:
        raise HTTPException(status_code=403, detail="你只能删除自己添加的歌曲。")
    session.delete(song)
    session.commit()


# ──────────────────────────────────────────────
# Recipes
# ──────────────────────────────────────────────

def _recipe_to_response(recipe: Recipe) -> RecipeResponse:
    ingredients = None
    if recipe.ingredients:
        try:
            ingredients = json.loads(recipe.ingredients)
        except json.JSONDecodeError:
            ingredients = None
    return RecipeResponse(
        id=recipe.id,
        couple_id=recipe.couple_id,
        added_by=recipe.added_by,
        title=recipe.title,
        description=recipe.description,
        ingredients=ingredients,
        instructions=recipe.instructions,
        photo_url=recipe.photo_url,
        rating=recipe.rating,
        cooked=recipe.cooked,
        created_at=recipe.created_at,
    )


@router.get("/recipes", response_model=list[RecipeResponse])
def list_recipes(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    stmt = (
        select(Recipe)
        .where(Recipe.couple_id == couple_id)
        .order_by(Recipe.created_at.desc())
    )
    recipes = session.exec(stmt).all()
    return [_recipe_to_response(r) for r in recipes]


@router.post("/recipes", response_model=RecipeResponse, status_code=201)
def create_recipe(
    data: RecipeCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    ingredients_json = json.dumps(data.ingredients) if data.ingredients else None
    recipe = Recipe(
        couple_id=couple_id,
        added_by=user.id,
        title=data.title,
        description=data.description,
        ingredients=ingredients_json,
        instructions=data.instructions,
        rating=data.rating,
    )
    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    try:
        award_xp(couple_id, user.id, "recipe_added", 5, session)
    except Exception:
        pass
    return _recipe_to_response(recipe)


@router.put("/recipes/{recipe_id}", response_model=RecipeResponse)
def update_recipe(
    recipe_id: int,
    data: RecipeUpdate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    recipe = session.get(Recipe, recipe_id)
    if not recipe or recipe.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="食谱未找到。")
    if data.title is not None:
        recipe.title = data.title
    if data.description is not None:
        recipe.description = data.description
    if data.ingredients is not None:
        recipe.ingredients = json.dumps(data.ingredients)
    if data.instructions is not None:
        recipe.instructions = data.instructions
    if data.rating is not None:
        recipe.rating = data.rating
    if data.cooked is not None:
        recipe.cooked = data.cooked
    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    return _recipe_to_response(recipe)


@router.post("/recipes/{recipe_id}/photo", response_model=RecipeResponse)
def upload_recipe_photo(
    recipe_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    recipe = session.get(Recipe, recipe_id)
    if not recipe or recipe.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="食谱未找到。")
    filename = f"recipe_{recipe_id}_{datetime.utcnow().timestamp()}.{file.filename.split('.')[-1]}"
    path = UPLOADS_IMAGES_DIR / filename
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    recipe.photo_url = f"/uploads/images/{filename}"
    session.add(recipe)
    session.commit()
    session.refresh(recipe)
    return _recipe_to_response(recipe)


@router.delete("/recipes/{recipe_id}", status_code=204)
def delete_recipe(
    recipe_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    recipe = session.get(Recipe, recipe_id)
    if not recipe or recipe.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="食谱未找到。")
    if recipe.added_by != user.id:
        raise HTTPException(status_code=403, detail="你只能删除自己添加的食谱。")
    session.delete(recipe)
    session.commit()


# ──────────────────────────────────────────────
# Timeline
# ──────────────────────────────────────────────

@router.get("/timeline", response_model=list[TimelineEventResponse])
def list_timeline(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    stmt = (
        select(TimelineEvent)
        .where(TimelineEvent.couple_id == couple_id)
        .order_by(TimelineEvent.event_date.desc())
    )
    return session.exec(stmt).all()


@router.post("/timeline", response_model=TimelineEventResponse, status_code=201)
def create_timeline_event(
    data: TimelineEventCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    event = TimelineEvent(
        couple_id=couple_id,
        added_by=user.id,
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        icon=data.icon,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.post("/timeline/{event_id}/photo", response_model=TimelineEventResponse)
def upload_timeline_photo(
    event_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    event = session.get(TimelineEvent, event_id)
    if not event or event.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="时间线事件未找到。")
    filename = f"timeline_{event_id}_{datetime.utcnow().timestamp()}.{file.filename.split('.')[-1]}"
    path = UPLOADS_IMAGES_DIR / filename
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    event.photo_url = f"/uploads/images/{filename}"
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/timeline/{event_id}", status_code=204)
def delete_timeline_event(
    event_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    event = session.get(TimelineEvent, event_id)
    if not event or event.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="时间线事件未找到。")
    if event.added_by != user.id:
        raise HTTPException(status_code=403, detail="你只能删除自己添加的事件。")
    session.delete(event)
    session.commit()


# ──────────────────────────────────────────────
# Dream Board
# ──────────────────────────────────────────────

@router.get("/dreams", response_model=list[DreamItemResponse])
def list_dreams(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    stmt = (
        select(DreamItem)
        .where(DreamItem.couple_id == couple_id)
        .order_by(DreamItem.created_at.desc())
    )
    return session.exec(stmt).all()


@router.post("/dreams", response_model=DreamItemResponse, status_code=201)
def create_dream(
    data: DreamItemCreate,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    dream = DreamItem(
        couple_id=couple_id,
        added_by=user.id,
        title=data.title,
        description=data.description,
        category=data.category,
    )
    session.add(dream)
    session.commit()
    session.refresh(dream)
    try:
        award_xp(couple_id, user.id, "dream_added", 5, session)
    except Exception:
        pass
    return dream


@router.post("/dreams/{dream_id}/complete", response_model=DreamItemResponse)
def toggle_dream_completed(
    dream_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    dream = session.get(DreamItem, dream_id)
    if not dream or dream.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="梦想未找到。")
    dream.completed = not dream.completed
    dream.completed_at = datetime.utcnow() if dream.completed else None
    session.add(dream)
    session.commit()
    session.refresh(dream)
    return dream


@router.post("/dreams/{dream_id}/image", response_model=DreamItemResponse)
def upload_dream_image(
    dream_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    dream = session.get(DreamItem, dream_id)
    if not dream or dream.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="梦想未找到。")
    filename = f"dream_{dream_id}_{datetime.utcnow().timestamp()}.{file.filename.split('.')[-1]}"
    path = UPLOADS_IMAGES_DIR / filename
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    dream.image_url = f"/uploads/images/{filename}"
    session.add(dream)
    session.commit()
    session.refresh(dream)
    return dream


@router.delete("/dreams/{dream_id}", status_code=204)
def delete_dream(
    dream_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    couple_id = require_couple(user)
    dream = session.get(DreamItem, dream_id)
    if not dream or dream.couple_id != couple_id:
        raise HTTPException(status_code=404, detail="梦想未找到。")
    if dream.added_by != user.id:
        raise HTTPException(status_code=403, detail="你只能删除自己添加的梦想。")
    session.delete(dream)
    session.commit()
