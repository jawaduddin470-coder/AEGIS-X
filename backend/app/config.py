import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "AEGIS X"
    TAGLINE: str = "Predict. Simulate. Respond."
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # ── Database (Neon PostgreSQL / SQLite fallback) ──────────────────────
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./aegis_x.db"
    )

    # ── Redis / Upstash ───────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "")
    UPSTASH_REDIS_REST_URL: str = os.getenv("UPSTASH_REDIS_REST_URL", "")
    UPSTASH_REDIS_REST_TOKEN: str = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

    # ── AI Copilot (OpenRouter) ───────────────────────────────────────────
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    WEATHER_API_URL: str = "https://api.open-meteo.com/v1/forecast"

    # ── Firebase ──────────────────────────────────────────────────────────
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "aegis-x-43e75")
    FIREBASE_API_KEY: str = os.getenv("FIREBASE_API_KEY", "")
    FIREBASE_AUTH_DOMAIN: str = os.getenv("FIREBASE_AUTH_DOMAIN", "")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("FIREBASE_STORAGE_BUCKET", "")
    FIREBASE_MESSAGING_SENDER_ID: str = os.getenv("FIREBASE_MESSAGING_SENDER_ID", "")
    FIREBASE_APP_ID: str = os.getenv("FIREBASE_APP_ID", "")
    FIREBASE_FCM_SERVER_KEY: str = os.getenv("FIREBASE_FCM_SERVER_KEY", "")

    # ── Cloudinary ────────────────────────────────────────────────────────
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    CLOUDINARY_URL: str = os.getenv("CLOUDINARY_URL", "")

    # ── Server ────────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── Geo Defaults ──────────────────────────────────────────────────────
    DEFAULT_CITY: str = "Hyderabad"
    DEFAULT_STATE: str = "Telangana"
    DEFAULT_COUNTRY: str = "India"
    DEFAULT_LAT: float = 17.3850
    DEFAULT_LON: float = 78.4867

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def is_dev_mode(self) -> bool:
        return not (
            self.DATABASE_URL.startswith("postgresql://")
            or self.DATABASE_URL.startswith("postgresql+psycopg2://")
            or self.DATABASE_URL.startswith("postgresql+asyncpg://")
        )

    @property
    def has_cloudinary(self) -> bool:
        return bool(self.CLOUDINARY_CLOUD_NAME and self.CLOUDINARY_API_KEY)

    @property
    def has_openrouter(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

    @property
    def has_redis(self) -> bool:
        return bool(self.UPSTASH_REDIS_REST_URL or self.REDIS_URL)

settings = Settings()
