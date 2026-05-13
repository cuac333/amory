import uuid
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlmodel import Session, select
from app.database import get_session
from app.auth.jwt import create_access_token
from app.auth.dependencies import get_current_user
from app.models.user import User, Couple
from app.models.extras import BookClue
from app.schemas.auth import (
    UserRegister, UserLogin, TokenResponse, UserResponse,
    CoupleCreate, CoupleJoin, CoupleResponse, PasswordReset,
)
from app.config import UPLOADS_IMAGES_DIR

router = APIRouter(prefix="/auth", tags=["auth"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


@router.post("/register", response_model=TokenResponse)
def register(data: UserRegister, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    user = User(
        name=data.name,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, name=user.name, email=user.email,
            avatar_url=user.avatar_url, role=user.role,
            couple_id=user.couple_id, created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="账号或密码错误")

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, name=user.name, email=user.email,
            avatar_url=user.avatar_url, role=user.role,
            couple_id=user.couple_id, created_at=user.created_at,
        ),
    )


@router.post("/reset-password")
def reset_password(data: PasswordReset, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email)).first()
    if not user or not user.couple_id:
        raise HTTPException(status_code=404, detail="未找到该用户")

    couple = session.get(Couple, user.couple_id)
    if not couple or couple.password_code != data.couple_code:
        raise HTTPException(status_code=403, detail="情侣密保码不正确")

    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="密码长度至少为6个字符")

    user.password_hash = hash_password(data.new_password)
    session.add(user)
    session.commit()

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, name=user.name, email=user.email,
            avatar_url=user.avatar_url, role=user.role,
            couple_id=user.couple_id, created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id, name=user.name, email=user.email,
        avatar_url=user.avatar_url, role=user.role,
        couple_id=user.couple_id, created_at=user.created_at,
    )


@router.post("/couple", response_model=CoupleResponse)
def create_couple(data: CoupleCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if user.couple_id:
        raise HTTPException(status_code=400, detail="你已经属于一个情侣")

    invite_code = uuid.uuid4().hex[:8]
    couple = Couple(
        anniversary_date=data.anniversary_date,
        password_code=data.password_code,
        invite_code=invite_code,
    )
    session.add(couple)
    session.commit()
    session.refresh(couple)

    user.couple_id = couple.id
    user.role = "partner_1"
    session.add(user)
    session.commit()

    return CoupleResponse(
        id=couple.id, anniversary_date=couple.anniversary_date,
        invite_code=couple.invite_code, photo_url=couple.photo_url,
        created_at=couple.created_at,
    )


@router.post("/couple/join", response_model=CoupleResponse)
def join_couple(data: CoupleJoin, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if user.couple_id:
        raise HTTPException(status_code=400, detail="你已经属于一个情侣")

    couple = session.exec(select(Couple).where(Couple.invite_code == data.invite_code)).first()
    if not couple:
        raise HTTPException(status_code=404, detail="邀请码无效")

    members = session.exec(select(User).where(User.couple_id == couple.id)).all()
    if len(members) >= 2:
        raise HTTPException(status_code=400, detail="该情侣已满员")

    user.couple_id = couple.id
    user.role = "partner_2"
    session.add(user)
    session.commit()

    return CoupleResponse(
        id=couple.id, anniversary_date=couple.anniversary_date,
        invite_code=couple.invite_code, photo_url=couple.photo_url,
        created_at=couple.created_at,
    )


@router.get("/couple", response_model=CoupleResponse)
def get_couple(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    couple = session.get(Couple, user.couple_id)
    if not couple:
        raise HTTPException(status_code=404, detail="情侣未找到")
    return CoupleResponse(
        id=couple.id, anniversary_date=couple.anniversary_date,
        invite_code=couple.invite_code, photo_url=couple.photo_url,
        created_at=couple.created_at,
    )


@router.post("/couple/verify-book")
def verify_book_password(data: dict, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    couple = session.get(Couple, user.couple_id)
    if not couple:
        raise HTTPException(status_code=404, detail="情侣未找到")

    # Check if there are clues configured
    clues = session.exec(
        select(BookClue).where(BookClue.couple_id == user.couple_id).order_by(BookClue.order)
    ).all()

    # If no clues exist, fall back to password_code
    if not clues:
        if not couple.password_code:
            # No clues and no password = locked until creator configures something
            return {"unlocked": False, "has_clues": False, "total_clues": 0}
        code = data.get("code", "")
        if code == couple.password_code:
            return {"unlocked": True, "has_clues": False, "total_clues": 0}
        return {"unlocked": False, "has_clues": False, "total_clues": 0}

    # Build the secret code from clue fragments
    secret = "".join(c.answer_fragment.strip().lower() for c in clues)
    code = data.get("code", "").strip().lower()
    total_clues = len(clues)

    if code == secret:
        return {"unlocked": True, "has_clues": True, "total_clues": total_clues}
    return {"unlocked": False, "has_clues": True, "total_clues": total_clues}


@router.put("/couple", response_model=CoupleResponse)
def update_couple(data: CoupleCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    couple = session.get(Couple, user.couple_id)
    if not couple:
        raise HTTPException(status_code=404, detail="情侣未找到")
    couple.anniversary_date = data.anniversary_date
    couple.password_code = data.password_code
    session.add(couple)
    session.commit()
    session.refresh(couple)
    return CoupleResponse(
        id=couple.id, anniversary_date=couple.anniversary_date,
        invite_code=couple.invite_code, photo_url=couple.photo_url,
        created_at=couple.created_at,
    )


@router.put("/me", response_model=UserResponse)
def update_me(name: str = None, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if name:
        user.name = name
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(
        id=user.id, name=user.name, email=user.email,
        avatar_url=user.avatar_url, role=user.role,
        couple_id=user.couple_id, created_at=user.created_at,
    )


@router.get("/partner", response_model=UserResponse)
def get_partner(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    partner = session.exec(
        select(User).where(User.couple_id == user.couple_id, User.id != user.id)
    ).first()
    if not partner:
        raise HTTPException(status_code=404, detail="你的伴侣还没有加入")
    return UserResponse(
        id=partner.id, name=partner.name, email=partner.email,
        avatar_url=partner.avatar_url, role=partner.role,
        couple_id=partner.couple_id, created_at=partner.created_at,
    )


@router.put("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"avatar_{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
    path = UPLOADS_IMAGES_DIR / filename
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    user.avatar_url = f"/uploads/images/{filename}"
    session.add(user)
    session.commit()
    session.refresh(user)
    return UserResponse(
        id=user.id, name=user.name, email=user.email,
        avatar_url=user.avatar_url, role=user.role,
        couple_id=user.couple_id, created_at=user.created_at,
    )


@router.put("/couple/photo", response_model=CoupleResponse)
async def upload_couple_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if not user.couple_id:
        raise HTTPException(status_code=404, detail="你不属于任何情侣")
    couple = session.get(Couple, user.couple_id)
    if not couple:
        raise HTTPException(status_code=404, detail="情侣未找到")
    UPLOADS_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"couple_{couple.id}_{uuid.uuid4().hex[:8]}.{ext}"
    path = UPLOADS_IMAGES_DIR / filename
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    couple.photo_url = f"/uploads/images/{filename}"
    session.add(couple)
    session.commit()
    session.refresh(couple)
    return CoupleResponse(
        id=couple.id, anniversary_date=couple.anniversary_date,
        invite_code=couple.invite_code, photo_url=couple.photo_url,
        created_at=couple.created_at,
    )
