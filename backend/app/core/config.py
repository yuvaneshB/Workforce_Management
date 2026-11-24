"""Application configuration loaded from environment variables and .env."""

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE_PATH = BACKEND_ROOT / ".env"

# Load .env explicitly if present without overriding existing process env vars.
load_dotenv(dotenv_path=ENV_FILE_PATH, override=False)


class Settings(BaseSettings):
    """Centralized backend settings."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = Field(default="Workforce Management AI API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    api_v1_prefix: str = Field(default="/api/v1", alias="API_V1_PREFIX")
    cors_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://localhost:4173,http://127.0.0.1:4173",
        alias="CORS_ORIGINS",
    )

    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    readonly_database_url: str | None = Field(default=None, alias="READONLY_DATABASE_URL")

    db_ssl_mode: str = Field(default="require", alias="DB_SSL_MODE")
    db_pool_size: int = Field(default=5, ge=1, le=50, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(default=10, ge=0, le=50, alias="DB_MAX_OVERFLOW")
    db_pool_timeout: int = Field(default=30, ge=1, le=120, alias="DB_POOL_TIMEOUT")
    db_pool_recycle: int = Field(default=300, ge=30, le=3600, alias="DB_POOL_RECYCLE")

    # Domo AI Services LLM Timeout Configuration
    domo_timeout: float = Field(default=60.0, ge=1.0, le=120.0, alias="DOMO_TIMEOUT")

    # Agent orchestration mode: "legacy" or "tools" (Phase 7.3 Multi-Agent Supervisor)

    # Agent Timeout Settings (AGENT_TOTAL_TIMEOUT_SEC, AGENT_CROSS_DOMAIN_TIMEOUT_SEC, AGENT_LLM_TIMEOUT_SEC)
    agent_total_timeout_sec: float = Field(default=100.0, ge=1.0, le=600.0, alias="AGENT_TOTAL_TIMEOUT_SEC")
    agent_cross_domain_timeout_sec: float = Field(default=120.0, ge=1.0, le=600.0, alias="AGENT_CROSS_DOMAIN_TIMEOUT_SEC")
    agent_llm_timeout_sec: float = Field(default=60.0, ge=1.0, le=300.0, alias="AGENT_LLM_TIMEOUT_SEC")

    # Workforce Intelligence Settings (Phase 7.1)
    dependency_backup_threshold: int = Field(default=1, alias="DEPENDENCY_BACKUP_THRESHOLD")
    max_overtime_hours_per_day: float | None = Field(default=None, alias="MAX_OVERTIME_HOURS_PER_DAY")
    max_hours_per_week: float | None = Field(default=None, alias="MAX_HOURS_PER_WEEK")

    # Plant-wise data folder mappings
    plant_data_dir: Path = Field(default=BACKEND_ROOT / "data", alias="PLANT_DATA_DIR")
    plant_folder_mappings: dict[str, str] = Field(
        default={
            "plant1": "IN-TN-01",
            "plant2": "IN-KA-01",
        },
        alias="PLANT_FOLDER_MAPPINGS",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def has_database_config(self) -> bool:
        return bool(self.database_url and self.database_url.strip())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings instance."""
    return Settings()

