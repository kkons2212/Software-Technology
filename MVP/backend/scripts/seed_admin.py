"""Seed the initial Administrator accounts (US 02.1 - TSK-02.1.1).

Creates the ORM schema when missing and inserts a default administrator whose
password is stored as a one-way Bcrypt hash (cost factor >= 12). The script is
idempotent: re-running it never overwrites an existing account.

Usage (from MVP/backend):
    .venv\\Scripts\\python scripts/seed_admin.py
"""

import os
import sys

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.audit import Audit  # noqa: E402,F401  (registers the Audit table)
from app.models.user import User  # noqa: E402
from app.repositories.user_repository import UserRepository  # noqa: E402

DEFAULT_ADMIN_USER_NAME = os.getenv("SEED_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@cuchi.vn")
DEFAULT_ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD", "Admin@12345")
DEFAULT_ADMIN_FULL_NAME = os.getenv("SEED_ADMIN_FULL_NAME", "System Administrator")


def seed_default_administrator() -> None:
    """Create the schema when needed and insert the default administrator once."""
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        user_repository = UserRepository(db)
        existing = user_repository.find_by_username(DEFAULT_ADMIN_USER_NAME)
        if existing is not None:
            print(
                f"Administrator '{DEFAULT_ADMIN_USER_NAME}' already exists; nothing to seed."
            )
            return

        user_repository.create_admin(
            User(
                user_name=DEFAULT_ADMIN_USER_NAME,
                email=DEFAULT_ADMIN_EMAIL,
                password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
                full_name=DEFAULT_ADMIN_FULL_NAME,
                is_active=True,
                falsed_attempts=0,
                locked_until=None,
            )
        )

    print(
        f"Seeded administrator '{DEFAULT_ADMIN_USER_NAME}' "
        f"({DEFAULT_ADMIN_EMAIL}) with a Bcrypt-hashed password."
    )


if __name__ == "__main__":
    seed_default_administrator()
