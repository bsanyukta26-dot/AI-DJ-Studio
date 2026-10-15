
from sqlalchemy import Column, Integer, String, Float
from app.database import Base


class Lounge(Base):
    __tablename__ = "lounges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, nullable=False)
    invite_code = Column(String, unique=True, index=True, nullable=False)
    vibe = Column(String, nullable=False, default="chill")
    target_bpm = Column(Float, nullable=False, default=120.0)
    bpm_tolerance = Column(Float, nullable=False, default=5.0)
