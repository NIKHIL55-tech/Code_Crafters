from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    groq_api_key: str | None = None
    groq_model: str | None = None
    hindsight_api_key: str | None = None
    hindsight_base_url: str | None = None
    hindsight_bank_id: str | None = None
    database_url: str = "sqlite:///./sql_app.db"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding='utf-8')

settings = Settings()
