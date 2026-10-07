from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

BUCKET = "product-images"
PAGE_SIZE = 12


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_publishable_key: str = ""
    supabase_service_role_key: str = ""
    cors_origins: str = ""

    @property
    def configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_publishable_key) and "YOUR_" not in (
            self.supabase_url + self.supabase_publishable_key
        )

    @property
    def admin_configured(self) -> bool:
        return (
            self.configured and bool(self.supabase_service_role_key) and "YOUR_" not in self.supabase_service_role_key
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
