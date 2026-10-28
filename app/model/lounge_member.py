
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from app.database import Base


class LoungeMember(Base):
    __tablename__ = "lounge_members"

    id = Column(Integer, primary_key=True, index=True)
    lounge_id = Column(
        Integer,
        ForeignKey("lounges.id"),
        nullable=False
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "lounge_id",
            "user_id",
            name="unique_lounge_member"
        ),
    )
