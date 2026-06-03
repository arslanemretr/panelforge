from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "dev-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    FIRST_ADMIN_EMAIL: str = "admin@panelforge.com"
    FIRST_ADMIN_PASSWORD: str = "changeme123"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
