from sqlalchemy import Column, Integer, String, Float
from app.database import Base


class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=False)
    bpm = Column(Float, nullable=False)
    camelot_key = Column(String, nullable=False)
    energy = Column(Float, nullable=False)
    valence = Column(Float, nullable=False)