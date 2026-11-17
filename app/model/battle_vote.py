from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from app.database import Base


class BattleVote(Base):
    __tablename__ = "battle_votes"

    id = Column(Integer, primary_key=True, index=True)
    battle_id = Column(Integer, ForeignKey("battles.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("battle_submissions.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("battle_id", "user_id"),
    )
