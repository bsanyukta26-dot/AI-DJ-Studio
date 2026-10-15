from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session


from app.database import Base, engine, SessionLocal
from app.model.user import User
from app.model.track import Track
from app.model.lounge import Lounge
from app.schemas import UserRegister, UserLogin, LoungeCreate
from app.security import (
    hash_password,
    verify_password,
    create_access_token
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI DJ Studio")


def seed_tracks():
    db = SessionLocal()

    try:
        if db.query(Track).count() == 0:
            sample_tracks = [
                Track(
                    title="Demo Track 1",
                    artist="Sample Artist A",
                    bpm=120,
                    camelot_key="8A",
                    energy=0.8,
                    valence=0.7
                ),
                Track(
                    title="Demo Track 2",
                    artist="Sample Artist B",
                    bpm=124,
                    camelot_key="9A",
                    energy=0.9,
                    valence=0.8
                ),
                Track(
                    title="Demo Track 3",
                    artist="Sample Artist C",
                    bpm=100,
                    camelot_key="5A",
                    energy=0.5,
                    valence=0.4
                )
            ]

            db.add_all(sample_tracks)
            db.commit()
    finally:
        db.close()


seed_tracks()



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "AI DJ Studio API is running"}


@app.get("/tracks")
def get_tracks(db: Session = Depends(get_db)):
    tracks = db.query(Track).all()

    return [
        {
            "id": track.id,
            "title": track.title,
            "artist": track.artist,
            "bpm": track.bpm,
            "camelot_key": track.camelot_key,
            "energy": track.energy,
            "valence": track.valence
        }
        for track in tracks
    ]

import secrets


@app.post("/lounges")
def create_lounge(
    lounge_data: LoungeCreate,
    db: Session = Depends(get_db)
):
    owner = db.query(User).filter(
        User.id == lounge_data.owner_id
    ).first()

    if not owner:
        raise HTTPException(
            status_code=404,
            detail="Owner user not found"
        )

    new_lounge = Lounge(
        name=lounge_data.name,
        owner_id=lounge_data.owner_id,
        invite_code=secrets.token_hex(4).upper(),
        vibe=lounge_data.vibe,
        target_bpm=lounge_data.target_bpm,
        bpm_tolerance=lounge_data.bpm_tolerance
    )

    db.add(new_lounge)
    db.commit()
    db.refresh(new_lounge)

    return {
        "message": "Lounge created successfully",
        "id": new_lounge.id,
        "name": new_lounge.name,
        "owner_id": new_lounge.owner_id,
        "invite_code": new_lounge.invite_code,
        "vibe": new_lounge.vibe,
        "target_bpm": new_lounge.target_bpm,
        "bpm_tolerance": new_lounge.bpm_tolerance
    }



@app.post("/register")
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    allowed_roles = [
        "Listener",
        "DJ",
        "Lounge Owner",
        "Admin"
    ]

    if user_data.role not in allowed_roles:
        raise HTTPException(status_code=400, detail="Invalid role")

    existing_user = db.query(User).filter(
        (User.username == user_data.username)
        | (User.email == user_data.email)
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "id": new_user.id,
        "username": new_user.username,
        "email": new_user.email,
        "role": new_user.role
    }
@app.post("/login")
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.username == user_data.username
    ).first()

    if not user or not verify_password(
        user_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }