
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint, func, CheckConstraint
from app.database import Base


class QueueVote(Base):
    __tablename__ = "queue_votes"

    id = Column(Integer, primary_key=True, index=True)

    queue_item_id = Column(
        Integer,
        ForeignKey("queue_items.id"),
        nullable=False,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True
    )

    vote = Column(Integer, nullable=False, default=1)

    created_at = Column(
        DateTime,
        nullable=False,
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "queue_item_id",
            "user_id",
            name="unique_user_vote_per_queue_item"
        ),
    )
