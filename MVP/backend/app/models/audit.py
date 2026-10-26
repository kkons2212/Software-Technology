"""SQLAlchemy model for Audit log table."""

from sqlalchemy import Column, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Audit(Base):
    __tablename__ = "Audit"

    AuditID = Column(String(20), primary_key=True, index=True)
    Status = Column(String(255), nullable=False)
    Ip_address = Column(String(45), nullable=True)
    Details = Column(String(255), nullable=True)
    Create_at = Column(DateTime, nullable=False, default=func.now(), index=True)
    UserName = Column(String(20), ForeignKey("User.UserName", ondelete="CASCADE"), nullable=False, index=True)

    user = relationship("User")
