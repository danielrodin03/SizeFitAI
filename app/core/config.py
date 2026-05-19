from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def default_database_url() -> str:
    db_path = (PROJECT_ROOT / "sizefitai.db").as_posix()
    return f"sqlite+aiosqlite:///{db_path}"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = default_database_url()

    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    cors_origins: str = "*"

    # Auto-attach demo reviews to new products; fall back to mock if AI fails
    demo_mode: bool = True


settings = Settings()
