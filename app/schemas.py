
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
