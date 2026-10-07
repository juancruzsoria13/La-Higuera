from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request

from .config import Settings, get_settings
from .supabase import Supabase


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str
    token: str


SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_http(request: Request) -> httpx.AsyncClient:
    return request.app.state.http


HttpDep = Annotated[httpx.AsyncClient, Depends(get_http)]


def require_configured(settings: SettingsDep) -> Settings:
    if not settings.configured:
        raise HTTPException(503, "Falta configurar Supabase en el backend. Consultá backend/.env.example.")
    return settings


async def current_user(request: Request, settings: SettingsDep, http: HttpDep) -> AuthUser | None:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer ") or not settings.configured:
        return None
    token = header[7:].strip()
    data = await Supabase(http, settings.supabase_url, settings.supabase_publishable_key, token).get_user()
    if not data or not data.get("id"):
        raise HTTPException(401, "Tu sesión expiró. Ingresá nuevamente.")
    return AuthUser(id=data["id"], email=data.get("email") or "", token=token)


CurrentUser = Annotated[AuthUser | None, Depends(current_user)]


def require_user(user: CurrentUser) -> AuthUser:
    if not user:
        raise HTTPException(401, "Ingresá a tu cuenta para continuar.")
    return user


UserDep = Annotated[AuthUser, Depends(require_user)]


def get_db(settings: Annotated[Settings, Depends(require_configured)], http: HttpDep, user: CurrentUser) -> Supabase:
    """Cliente con la identidad de quien llama: RLS decide qué puede ver y modificar."""
    return Supabase(http, settings.supabase_url, settings.supabase_publishable_key, user.token if user else None)


DbDep = Annotated[Supabase, Depends(get_db)]


def get_admin_db(settings: SettingsDep, http: HttpDep) -> Supabase:
    if not settings.admin_configured:
        raise HTTPException(503, "La eliminación de cuentas todavía no está configurada en el servidor.")
    return Supabase(http, settings.supabase_url, settings.supabase_service_role_key)


AdminDbDep = Annotated[Supabase, Depends(get_admin_db)]
