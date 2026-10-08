"""Cliente HTTP mínimo para Supabase (PostgREST, Storage y Auth).

Cada instancia actúa con una identidad: el token del usuario (las políticas RLS se aplican
igual que antes en Next.js), la clave pública (anónimo) o la clave secreta (administración).
"""

from typing import Any

import httpx


class SupabaseError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def _is_jwt(key: str) -> bool:
    return key.startswith("eyJ")


class Supabase:
    def __init__(self, http: httpx.AsyncClient, url: str, key: str, token: str | None = None):
        self.http = http
        self.url = url.rstrip("/")
        self.headers = {"apikey": key}
        # Las claves nuevas (sb_publishable_/sb_secret_) no son JWT y van solo en `apikey`.
        bearer = token or (key if _is_jwt(key) else None)
        if bearer:
            self.headers["Authorization"] = f"Bearer {bearer}"

    async def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        response = await self.http.request(method, f"{self.url}{path}", headers=headers, **kwargs)
        if response.status_code >= 400:
            raise SupabaseError(response.status_code, response.text[:500])
        return response

    # PostgREST ---------------------------------------------------------------------------
    async def select(
        self,
        table: str,
        filters: list[tuple[str, str]] | None = None,
        *,
        columns: str = "*",
        order: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        count: bool = False,
    ) -> tuple[list[dict[str, Any]], int | None]:
        params = [("select", columns), *(filters or [])]
        if order:
            params.append(("order", order))
        if offset is not None:
            params.append(("offset", str(offset)))
        if limit is not None:
            params.append(("limit", str(limit)))
        headers = {"Prefer": "count=exact"} if count else {}
        response = await self._request("GET", f"/rest/v1/{table}", params=params, headers=headers)
        total = None
        if count:
            total_part = response.headers.get("content-range", "*/0").split("/")[-1]
            total = int(total_part) if total_part.isdigit() else 0
        return response.json(), total

    async def insert(self, table: str, row: dict[str, Any]) -> list[dict[str, Any]]:
        response = await self._request(
            "POST", f"/rest/v1/{table}", json=row, headers={"Prefer": "return=representation"}
        )
        return response.json()

    async def update(self, table: str, filters: list[tuple[str, str]], values: dict[str, Any]) -> list[dict[str, Any]]:
        response = await self._request(
            "PATCH", f"/rest/v1/{table}", params=filters, json=values, headers={"Prefer": "return=representation"}
        )
        return response.json()

    async def delete(self, table: str, filters: list[tuple[str, str]]) -> list[dict[str, Any]]:
        response = await self._request(
            "DELETE", f"/rest/v1/{table}", params=filters, headers={"Prefer": "return=representation"}
        )
        return response.json()

    async def rpc(self, function: str, args: dict[str, Any] | None = None) -> Any:
        response = await self._request("POST", f"/rest/v1/rpc/{function}", json=args or {})
        return response.json() if response.content else None

    # Storage -----------------------------------------------------------------------------
    async def upload(self, bucket: str, path: str, data: bytes, content_type: str) -> None:
        await self._request(
            "POST",
            f"/storage/v1/object/{bucket}/{path}",
            content=data,
            headers={"Content-Type": content_type, "x-upsert": "false"},
        )

    async def download(self, bucket: str, path: str) -> bytes | None:
        try:
            response = await self._request("GET", f"/storage/v1/object/authenticated/{bucket}/{path}")
        except SupabaseError:
            return None
        return response.content

    async def remove(self, bucket: str, paths: list[str]) -> None:
        await self._request("DELETE", f"/storage/v1/object/{bucket}", json={"prefixes": paths})

    async def list_objects(self, bucket: str, prefix: str, limit: int = 100) -> list[dict[str, Any]]:
        response = await self._request(
            "POST", f"/storage/v1/object/list/{bucket}", json={"prefix": prefix, "limit": limit, "offset": 0}
        )
        return response.json()

    # Auth --------------------------------------------------------------------------------
    async def get_user(self) -> dict[str, Any] | None:
        """Verifica el token contra Auth (equivale a `getUser()` del SDK de JS)."""
        try:
            response = await self._request("GET", "/auth/v1/user")
        except SupabaseError:
            return None
        return response.json()

    async def admin_delete_user(self, user_id: str) -> None:
        await self._request("DELETE", f"/auth/v1/admin/users/{user_id}")
