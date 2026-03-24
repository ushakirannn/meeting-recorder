from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    assemblyai_api_key: str
    anthropic_api_key: str = ""
    max_file_size_mb: int = 200
    upload_dir: str = "temp_uploads"

    class Config:
        env_file = ".env"


settings = Settings()
