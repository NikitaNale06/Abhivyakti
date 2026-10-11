from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    api_prefix: str = "/api/v1"
    cors_origins: str = "*"
    model_path: str = "models/isl_static_v1.pt"
    label_map_path: str = "models/label_map.json"
    confidence_threshold: float = 0.60

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()