
from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class QueueItem(Base):
    __tablename__ = "queue_items"

    id = Column(Integer, primary_key=True, index=True)

    lounge_id = Column(
        Integer,
        ForeignKey("lounges.id"),
        nullable=False,
        index=True
    )

    track_id = Column(
        Integer,
        ForeignKey("tracks.id"),
        nullable=False
    )

    added_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    position = Column(Integer, nullable=False)

    added_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )
    track = relationship("Track")
