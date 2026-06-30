"""
AEGIS X — Database Engine
Supports Neon PostgreSQL (production) and SQLite (local dev fallback)
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# ── Build connection args based on database type ──────────────────────────────
connect_args = {}
engine_kwargs = {}

if settings.is_dev_mode:
    # SQLite local development
    connect_args = {"check_same_thread": False}
else:
    # Neon PostgreSQL — disable statement cache for serverless pooling
    connect_args = {
        "options": "-c statement_timeout=30000",
    }
    engine_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

# ── Handle asyncpg / psycopg2 URL schemes ────────────────────────────────────
db_url = settings.DATABASE_URL
# Neon URLs come with postgresql:// — SQLAlchemy needs postgresql+psycopg2://
if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(
    db_url,
    connect_args=connect_args,
    **engine_kwargs,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_connection() -> bool:
    """Returns True if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("✅ Database connection successful")
        return True
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        return False
