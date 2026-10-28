
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str = "Listener"


class UserLogin(BaseModel):
    username: str
    password: str


class LoungeCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    owner_id: int = Field(..., gt=0)
    vibe: str = "chill"
    target_bpm: float = Field(default=120.0, ge=60, le=200)
    bpm_tolerance: float = Field(default=5.0, ge=0, le=20)


from typing import List


class AcousticFeatures(BaseModel):
    bpm: float
    camelotKey: str
    energy: float
    valence: float


class MetadataTimelineItem(BaseModel):
    category: str
    content: str


class TrackAcousticProfile(BaseModel):
    trackId: int
    title: str
    artist: str
    acoustic: AcousticFeatures
    timeline: List[MetadataTimelineItem]


class LoungeJoin(BaseModel):
    invite_code: str = Field(..., min_length=1, max_length=20)
    user_id: int = Field(..., gt=0)


class QueueAdd(BaseModel):
    lounge_id: int = Field(..., gt=0)
    track_id: int = Field(..., gt=0)
    user_id: int = Field(..., gt=0)
