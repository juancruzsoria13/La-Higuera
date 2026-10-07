"""Prueba de integración contra un proyecto Supabase REAL de pruebas (crea y borra dos usuarios).

Uso: ALLOW_INTEGRATION_TESTS=true python -m scripts.integration   (desde backend/, con backend/.env)
Requiere las migraciones de database/migrations aplicadas.
"""

import asyncio
import os
import sys
import uuid
from io import BytesIO

import httpx
from PIL import Image

from app.config import BUCKET, get_settings
from app.supabase import Supabase, SupabaseError


async def fails(coroutine) -> bool:
    try:
        await coroutine
    except SupabaseError:
        return True
    return False


async def main() -> int:
    settings = get_settings()
    if not settings.admin_configured or os.environ.get("ALLOW_INTEGRATION_TESTS") != "true":
        print("Faltan credenciales o ALLOW_INTEGRATION_TESTS=true. Usá un proyecto de pruebas.", file=sys.stderr)
        return 1
    url, key, secret = settings.supabase_url, settings.supabase_publishable_key, settings.supabase_service_role_key
    async with httpx.AsyncClient(timeout=30) as http:
        admin = Supabase(http, url, secret)
        anon = Supabase(http, url, key)
        users: list[dict] = []

        async def sign_in(email: str, password: str) -> Supabase:
            response = await http.post(
                f"{url}/auth/v1/token",
                params={"grant_type": "password"},
                headers={"apikey": key},
                json={"email": email, "password": password},
            )
            response.raise_for_status()
            return Supabase(http, url, key, response.json()["access_token"])

        async def remove_account(user_id: str) -> None:
            while files := await admin.list_objects(BUCKET, user_id):
                await admin.remove(BUCKET, [f"{user_id}/{file['name']}" for file in files])
            await admin.admin_delete_user(user_id)
            await admin.delete("storage_cleanup", [("owner_id", f"eq.{user_id}")])

        try:
            for name in ("Ana", "Bruno"):
                email, password = f"la-higuera-test-{uuid.uuid4()}@example.com", f"Test!{uuid.uuid4()}"
                created = await admin._request(
                    "POST",
                    "/auth/v1/admin/users",
                    json={
                        "email": email,
                        "password": password,
                        "email_confirm": True,
                        "user_metadata": {"display_name": name},
                    },
                )
                user_id = created.json()["id"]
                users.append({"id": user_id, "email": email, "password": password})
                users[-1]["db"] = await sign_in(email, password)
                profile, _ = await users[-1]["db"].select("profiles")
                assert profile[0]["display_name"] == name
            a, b = users
            A, B = a["db"], b["db"]

            await A.update("profiles", [("id", f"eq.{a['id']}")], {"locality": "Rivadavia"})
            assert (await A.select("profiles", [("id", f"eq.{a['id']}")]))[0][0]["locality"] == "Rivadavia"
            assert (await B.select("profiles", [("id", f"eq.{a['id']}")]))[0] == []
            assert await fails(anon.select("profiles"))

            product = {
                "owner_id": a["id"],
                "title": "Bicicleta de prueba",
                "description": "Prueba automatizada de persistencia",
                "price": 1500.25,
                "currency": "ARS",
                "category": "Otros",
                "condition": "usado",
                "locality": "Capital",
                "status": "activo",
            }
            pid = (await A.insert("products", product))[0]["id"]
            fresh = await sign_in(a["email"], a["password"])
            assert (await fresh.select("products", [("id", f"eq.{pid}")]))[0][0]["price"] == 1500.25
            assert await anon.rpc("product_seller", {"product_id": pid}) == "Ana"
            assert await B.update("products", [("id", f"eq.{pid}")], {"price": 1}) == []
            assert await B.delete("products", [("id", f"eq.{pid}")]) == []
            assert await fails(B.insert("products", product))
            assert await fails(A.update("products", [("id", f"eq.{pid}")], {"owner_id": b["id"]}))
            business = await B.insert(
                "businesses", {"owner_id": b["id"], "name": "Comercio de prueba", "slug": f"test-{uuid.uuid4()}"}
            )
            assert await fails(A.update("products", [("id", f"eq.{pid}")], {"business_id": business[0]["id"]}))
            for status in ("pausado", "vendido", "activo"):
                await A.update("products", [("id", f"eq.{pid}")], {"status": status})
                visible, _ = await anon.select("products", [("id", f"eq.{pid}")])
                assert len(visible) == (1 if status == "activo" else 0)
                if status != "activo":
                    assert (await B.select("products", [("id", f"eq.{pid}")]))[0] == []

            buffer = BytesIO()
            Image.new("RGB", (12, 12), "green").save(buffer, "WEBP")
            path = await A.rpc("reserve_image")
            await A.upload(BUCKET, path, buffer.getvalue(), "image/webp")
            await A.update("products", [("id", f"eq.{pid}")], {"image_path": path})
            assert await anon.download(BUCKET, path) is not None
            await fails(B.remove(BUCKET, [path]))
            assert await A.download(BUCKET, path) is not None
            assert await fails(B.upload(BUCKET, f"{a['id']}/{uuid.uuid4()}.webp", buffer.getvalue(), "image/webp"))
            await A.update("products", [("id", f"eq.{pid}")], {"status": "pausado"})
            assert await anon.download(BUCKET, path) is None
            assert await B.download(BUCKET, path) is None
            await A.delete("products", [("id", f"eq.{pid}")])
            assert (await A.select("storage_cleanup", [("path", f"eq.{path}")]))[0][0]["ready"] is True
            await A.remove(BUCKET, [path])
            await A.delete("storage_cleanup", [("path", f"eq.{path}")])

            service = {
                "owner_id": a["id"],
                "name": "Ana Gas",
                "trade": "Gasista",
                "license_number": "1234",
                "license_body": "ENARGAS",
                "description": "Instalaciones de gas",
                "phone": "2644123456",
                "locality": "Capital",
            }
            sid = (await A.insert("service_providers", service))[0]["id"]
            assert await fails(A.update("service_providers", [("id", f"eq.{sid}")], {"verified": True}))
            assert len((await anon.select("service_providers", [("id", f"eq.{sid}")]))[0]) == 1
            assert await B.update("service_providers", [("id", f"eq.{sid}")], {"name": "Hack"}) == []

            # El borrado en Auth debe arrastrar comercio, anuncio y servicio, no solo una cuenta vacía.
            own = await A.insert(
                "businesses", {"owner_id": a["id"], "name": "Comercio Ana", "slug": f"test-{uuid.uuid4()}"}
            )
            await A.insert("products", {**product, "business_id": own[0]["id"]})
            await A.rpc("begin_account_deletion")
            assert await fails(A.rpc("reserve_image"))
            await remove_account(a["id"])
            for table, column in (
                ("profiles", "id"),
                ("products", "owner_id"),
                ("businesses", "owner_id"),
                ("service_providers", "owner_id"),
            ):
                assert (await admin.select(table, [(column, f"eq.{a['id']}")]))[0] == []
            assert await A.get_user() is None
            assert len((await B.select("profiles", [("id", f"eq.{b['id']}")]))[0]) == 1
            users.pop(0)
            print("OK: Supabase real, dos usuarios, persistencia, CRUD, RLS, comercios, servicios, Storage y Auth.")
            return 0
        finally:
            for user in users:
                try:
                    await remove_account(user["id"])
                except SupabaseError:
                    print("No se pudo limpiar el usuario temporal:", user["id"], file=sys.stderr)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
