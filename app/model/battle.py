from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class Battle(Base):
    __tablename__ = "battles"

    id = Column(Integer, primary_key=True, index=True)

    lounge_id = Column(
        Integer,
        ForeignKey("lounges.id"),
        nullable=False
    )

    challenger_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    opponent_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    status = Column(
        String,
        default="pending",
        nullable=False
    )

    winner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    started_at = Column(DateTime(timezone=True), nullable=True)

    ended_at = Column(DateTime(timezone=True), nullable=True)