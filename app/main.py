import json
from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import Base, engine, SessionLocal
from app.model.user import User
from app.model.track import Track
from app.model.lounge import Lounge
from app.model.lounge_member import LoungeMember
from app.model.queue_item import QueueItem
from app.model.queue_vote import QueueVote
from app.queue_manager import queue_manager

from app.schemas import (
    UserRegister,
    UserLogin,
    LoungeCreate,
    TrackAcousticProfile,
    AcousticFeatures,
    MetadataTimelineItem,
    LoungeJoin,
    QueueAdd,
    QueueVoteCreate,
)
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


@app.get("/api/v1/tracks/{trackId}/acoustic-profile", response_model=TrackAcousticProfile)
def get_track_acoustic_profile(trackId: int, db: Session = Depends(get_db)):
    from fastapi import HTTPException

    track = db.query(Track).filter(Track.id == trackId).first()

    if track is None:
        raise HTTPException(status_code=404, detail="Track not found")

    return {
        "trackId": track.id,
        "title": track.title,
        "artist": track.artist,
        "acoustic": {
            "bpm": track.bpm,
            "camelotKey": track.camelot_key,
            "energy": track.energy,
            "valence": track.valence,
        },
        "timeline": [],
    }



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


@app.post("/lounges/join")
def join_lounge(
    join_data: LoungeJoin,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(
        User.id == join_data.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    lounge = db.query(Lounge).filter(
        Lounge.invite_code == join_data.invite_code.strip().upper()
    ).first()

    if not lounge:
        raise HTTPException(
            status_code=404,
            detail="Invalid lounge invite code"
        )

    existing_member = db.query(LoungeMember).filter(
        LoungeMember.lounge_id == lounge.id,
        LoungeMember.user_id == user.id
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=409,
            detail="User has already joined this lounge"
        )

    membership = LoungeMember(
        lounge_id=lounge.id,
        user_id=user.id
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    return {
        "message": "Joined lounge successfully",
        "lounge_id": lounge.id,
        "lounge_name": lounge.name,
        "user_id": user.id
    }


@app.post("/lounges/{lounge_id}/queue")
async def add_to_queue(
    lounge_id: int,
    queue_data: QueueAdd,
    db: Session = Depends(get_db)
):
    # Check that the lounge exists
    lounge = db.query(Lounge).filter(
        Lounge.id == lounge_id
    ).first()

    if not lounge:
        raise HTTPException(
            status_code=404,
            detail="Lounge not found"
        )

    # Check that the user exists
    user = db.query(User).filter(
        User.id == queue_data.user_id
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Check that the user has joined this lounge
    membership = db.query(LoungeMember).filter(
        LoungeMember.lounge_id == lounge_id,
        LoungeMember.user_id == queue_data.user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Join this lounge before adding tracks"
        )

    # Check that the track exists
    track = db.query(Track).filter(
        Track.id == queue_data.track_id
    ).first()

    if not track:
        raise HTTPException(
            status_code=404,
            detail="Track not found"
        )

    # Place the new track at the end of the queue
    last_item = db.query(QueueItem).filter(
        QueueItem.lounge_id == lounge_id
    ).order_by(
        QueueItem.position.desc()
    ).first()

    next_position = 1 if last_item is None else last_item.position + 1

    queue_item = QueueItem(
        lounge_id=lounge_id,
        track_id=track.id,
        added_by=user.id,
        position=next_position
    )

    db.add(queue_item)
    db.commit()
    db.refresh(queue_item)

    # Build the complete updated queue for connected clients.
    updated_queue = db.query(QueueItem).filter(
        QueueItem.lounge_id == lounge_id
    ).order_by(
        QueueItem.position.asc()
    ).all()

    await queue_manager.broadcast(
        lounge_id,
        {
            "event": "lounge.queue.update",
            "payload": {
                "queue": [
                    {
                        "queue_item_id": item.id,
                        "track_id": item.track_id,
                        "track_title": item.track.title,
                        "artist": item.track.artist,
                        "added_by": item.added_by,
                        "position": item.position
                    }
                    for item in updated_queue
                ],
                "reason": "add"
            }
        }
    )
    
    return {
        "message": "Track added to queue successfully",
        "queue_item_id": queue_item.id,
        "lounge_id": lounge_id,
        "track_id": track.id,
        "track_title": track.title,
        "added_by": user.id,
        "position": queue_item.position
    }
    
@app.get("/lounges/{lounge_id}/queue")
def get_lounge_queue(
    lounge_id: int,
    db: Session = Depends(get_db)
):
    lounge = db.query(Lounge).filter(
        Lounge.id == lounge_id
    ).first()

    if not lounge:
        raise HTTPException(
            status_code=404,
            detail="Lounge not found"
        )

    queue_items = db.query(QueueItem).filter(
        QueueItem.lounge_id == lounge_id
    ).order_by(
        QueueItem.position.asc()
    ).all()

    return {
        "lounge_id": lounge_id,
        "lounge_name": lounge.name,
        "queue": [
            {
                "queue_item_id": item.id,
                "track_id": item.track_id,
                "track_title": item.track.title,
                "artist": item.track.artist,
                "added_by": item.added_by,
                "position": item.position,
                "added_at": item.added_at
            }
            for item in queue_items
        ]
    }


@app.post("/lounges/{lounge_id}/queue/{queue_item_id}/vote")
async def vote_for_queue_item(
    lounge_id: int,
    queue_item_id: int,
    vote_data: QueueVoteCreate,
    db: Session = Depends(get_db)
):
    # Check that the lounge exists.
    lounge = db.query(Lounge).filter(
        Lounge.id == lounge_id
    ).first()

    if not lounge:
        raise HTTPException(
            status_code=404,
            detail="Lounge not found"
        )

    # Check that the queue item belongs to this lounge.
    queue_item = db.query(QueueItem).filter(
        QueueItem.id == queue_item_id,
        QueueItem.lounge_id == lounge_id
    ).first()

    if not queue_item:
        raise HTTPException(
            status_code=404,
            detail="Queue item not found in this lounge"
        )

    # Only lounge members can vote.
    membership = db.query(LoungeMember).filter(
        LoungeMember.lounge_id == lounge_id,
        LoungeMember.user_id == vote_data.user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=403,
            detail="Join this lounge before voting"
        )

    # Find this user's existing vote.
    existing_vote = db.query(QueueVote).filter(
        QueueVote.queue_item_id == queue_item_id,
        QueueVote.user_id == vote_data.user_id
    ).first()

    if vote_data.vote == 0:
        if existing_vote:
            db.delete(existing_vote)

    elif existing_vote:
        existing_vote.vote = vote_data.vote

    else:
        new_vote = QueueVote(
            queue_item_id=queue_item_id,
            user_id=vote_data.user_id,
            vote=vote_data.vote
        )
        db.add(new_vote)

    db.commit()

       # Calculate the net vote score for this queue item.
    vote_score = db.query(
        func.coalesce(func.sum(QueueVote.vote), 0)
    ).filter(
        QueueVote.queue_item_id == queue_item_id
    ).scalar()

    # Get all queue items in their current order.
    queue_items = db.query(QueueItem).filter(
        QueueItem.lounge_id == lounge_id
    ).order_by(
        QueueItem.position.asc()
    ).all()

    # Calculate each item's net vote score.
    scored_items = []
    for item in queue_items:
        score = db.query(
            func.coalesce(func.sum(QueueVote.vote), 0)
        ).filter(
            QueueVote.queue_item_id == item.id
        ).scalar()

        scored_items.append((item, score))

    # Higher scores come first; ties preserve the existing order.
    scored_items.sort(key=lambda pair: pair[1], reverse=True)

    # Move positions temporarily out of the final range.
    for position, (item, score) in enumerate(scored_items, start=1):
        item.position = position + len(scored_items)

    db.flush()

    # Assign the final positions in vote-score order.
    for position, (item, score) in enumerate(scored_items, start=1):
        item.position = position

    db.commit()


    # Broadcast the reordered queue to connected WebSocket clients.
    updated_queue = db.query(QueueItem).filter(
        QueueItem.lounge_id == lounge_id
    ).order_by(
        QueueItem.position.asc()
    ).all()

    await queue_manager.broadcast(
        lounge_id,
        {
            "event": "lounge.queue.update",
            "payload": {
                "queue": [
                    {
                        "queue_item_id": item.id,
                        "track_id": item.track_id,
                        "track_title": item.track.title,
                        "artist": item.track.artist,
                        "added_by": item.added_by,
                        "position": item.position
                    }
                    for item in updated_queue
                ],
                "reason": "vote"
            }
        }
    )

    return {
        "message": "Vote updated successfully",
        "lounge_id": lounge_id,
        "queue_item_id": queue_item_id,
        "vote_score": vote_score
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


@app.websocket("/ws/lounges/{lounge_id}")
async def lounge_queue_websocket(
    websocket: WebSocket,
    lounge_id: int
):
    await queue_manager.connect(lounge_id, websocket)

    try:
        while True:
            raw_message = await websocket.receive_text()

            try:
                message = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "event": "lounge.chat.error",
                    "loungeId": lounge_id,
                    "payload": {
                        "message": "Invalid JSON message"
                    }
                })
                continue

            if not isinstance(message, dict):
                await websocket.send_json({
                    "event": "lounge.chat.error",
                    "loungeId": lounge_id,
                    "payload": {
                        "message": "Message must be a JSON object"
                    }
                })
                continue

            if message.get("event") != "lounge.chat.message":
                continue

            payload = message.get("payload", {})

            if not isinstance(payload, dict):
                continue

            username = payload.get("username")
            text = payload.get("message")

            if not isinstance(username, str) or not isinstance(text, str):
                continue

            username = username.strip()
            text = text.strip()

            if not username or not text:
                continue

            if len(username) > 50 or len(text) > 1000:
                continue

            await queue_manager.broadcast(
                lounge_id,
                {
                    "event": "lounge.chat.message",
                    "payload": {
                        "username": username,
                        "message": text
                    }
                }
            )

    except WebSocketDisconnect:
        queue_manager.disconnect(lounge_id, websocket)
