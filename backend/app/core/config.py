import json
import os
import ssl
from typing import List, Union
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/acm_shark_tank",
    )
    JWT_SECRET: str = "super_secret_acm_shark_tank_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    CORS_ORIGIN_REGEX: str = r"^https:\/\/.*\.app\.github\.dev$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            origins = [i.strip() for i in v.split(",") if i.strip()]
            return origins if origins else ["*"]
        return v

    @property
    def is_neon_db(self) -> bool:
        """Detect whether the database URL points to Neon DB or requires SSL."""
        raw_url = self.DATABASE_URL.lower()
        return "neon.tech" in raw_url or "sslmode=require" in raw_url or "ssl=require" in raw_url

    @property
    def async_database_url(self) -> str:
        """
        Convert standard PostgreSQL URL (postgres:// or postgresql://)
        into asyncpg compatible format (postgresql+asyncpg://) and sanitize
        any query parameters (like sslmode) that asyncpg rejects as kwargs.
        """
        url = self.DATABASE_URL.strip()
        if url.startswith("postgres://"):
            url = "postgresql+asyncpg://" + url[len("postgres://") :]
        elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = "postgresql+asyncpg://" + url[len("postgresql://") :]

        # Parse query params to strip libpq-specific params like sslmode that break asyncpg
        parsed = urlparse(url)
        if parsed.query:
            query_dict = parse_qs(parsed.query)
            # Remove libpq parameters that asyncpg handles via connect_args instead
            query_dict.pop("sslmode", None)
            query_dict.pop("channel_binding", None)
            new_query = urlencode(query_dict, doseq=True)
            url = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path,
                parsed.params,
                new_query,
                parsed.fragment,
            ))
        return url

    def get_engine_args(self) -> dict:
        """
        Produce connection arguments tailored for Neon DB serverless
        and local PostgreSQL instances.
        """
        connect_args = {}
        if self.is_neon_db:
            # Neon DB requires SSL/TLS
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ssl_ctx

        return {
            "echo": False,
            "pool_pre_ping": True,  # Critical for Neon's autosuspend / pooled connections
            "pool_recycle": 300,    # Recycle connections every 5 minutes
            "connect_args": connect_args,
        }


settings = Settings()
