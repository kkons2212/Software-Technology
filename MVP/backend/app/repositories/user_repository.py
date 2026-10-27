"""Repository for `User` persistence: 100% data access, zero business logic.

US 02.1 - TSK-02.1.2. Sessions arrive already open from the JIT `get_db`
dependency, so every query runs inside a short-lived connection and the caller
closes it immediately afterwards.
"""

from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Encapsulates every ORM query issued against the `User` table."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def find_by_username(self, user_name: str) -> User | None:
        """Return the administrator with this username, or None when absent."""
        return self.db.query(User).filter(User.user_name == user_name).first()

    def find_by_email(self, email: str) -> User | None:
        """Return the administrator with this email, or None when absent."""
        return self.db.query(User).filter(User.email == email).first()

    def create_admin(self, user: User) -> User:
        """Persist a new administrator account and refresh it with DB defaults."""
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
