from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mongodb_uri: str = "mongodb://localhost:27017"
    host: str = "0.0.0.0"
    port: int = 8000
    session_cookie_name: str = "beli_session"
    session_ttl_hours: int = 24
    session_cookie_secure: bool = False

    @property
    def session_ttl_seconds(self) -> int:
        return self.session_ttl_hours * 60 * 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
