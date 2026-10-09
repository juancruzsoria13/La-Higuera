"""Prueba de integración contra un proyecto Supabase REAL de pruebas (crea y borra dos usuarios).

Uso: ALLOW_INTEGRATION_TESTS=true python -m scripts.integration   (desde backend/, con backend/.env)
Requiere todas las migraciones de database/migrations aplicadas.
"""

import asyncio
import os
import sys
import uuid
from datetime import UTC, datetime, timedelta
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

        async def photo(db: Supabase, color: str) -> str:
            buffer = BytesIO()
            Image.new("RGB", (12, 12), color).save(buffer, "WEBP")
            path = await db.rpc("reserve_image")
            await db.upload(BUCKET, path, buffer.getvalue(), "image/webp")
            return path

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
                profile, _ = await users[-1]["db"].select("profiles", [("id", f"eq.{user_id}")])
                assert profile[0]["display_name"] == name and profile[0]["locality_id"] == "capital"
            a, b = users
            A, B = a["db"], b["db"]

            # Listas de referencia y ficha pública del vendedor.
            for table, size in (("localities", 19), ("categories", 8), ("trades", 12)):
                assert len((await anon.select(table))[0]) == size
            assert await fails(A.insert("categories", {"id": "nuevo", "name": "Nuevo"}))
            await A.update("profiles", [("id", f"eq.{a['id']}")], {"locality_id": "rivadavia"})
            assert (await B.select("profiles", [("id", f"eq.{a['id']}")]))[0][0]["locality_id"] == "rivadavia"
            assert len((await anon.select("profiles", [("id", f"eq.{a['id']}")]))[0]) == 1
            assert await fails(A.update("profiles", [("id", f"eq.{a['id']}")], {"rating_score": 5}))
            assert await fails(A.update("profiles", [("id", f"eq.{a['id']}")], {"locality_id": "mendoza"}))

            product = {
                "owner_id": a["id"],
                "title": "Bicicleta de prueba",
                "description": "Prueba automatizada de persistencia",
                "price": 1500.25,
                "currency": "ARS",
                "category_id": "otros",
                "condition": "usado",
                "locality_id": "capital",
                "contact_phone": "2644123456",
                "status": "activo",
            }
            assert await fails(A.insert("products", {**product, "contact_phone": None}))
            assert await fails(A.insert("products", {**product, "category_id": "inmuebles"}))
            assert await fails(A.insert("products", {**product, "operation": "venta"}))
            assert await fails(A.insert("products", {**product, "hidden": False}))
            house = (await A.insert("products", {**product, "category_id": "inmuebles", "operation": "alquiler"}))[0]
            await A.delete("products", [("id", f"eq.{house['id']}")])
            pid = (await A.insert("products", product))[0]["id"]
            fresh = await sign_in(a["email"], a["password"])
            saved = (await fresh.select("products", [("id", f"eq.{pid}")]))[0][0]
            assert saved["price"] == 1500.25 and saved["hidden"] is False
            assert datetime.fromisoformat(saved["expires_at"]) > datetime.now(UTC) + timedelta(days=59)
            assert await anon.rpc("product_seller", {"product_id": pid}) == "Ana"
            assert await B.update("products", [("id", f"eq.{pid}")], {"price": 1}) == []
            assert await B.delete("products", [("id", f"eq.{pid}")]) == []
            assert await fails(B.insert("products", product))
            assert await fails(A.update("products", [("id", f"eq.{pid}")], {"owner_id": b["id"]}))
            assert await fails(A.update("products", [("id", f"eq.{pid}")], {"hidden": True}))
            assert await fails(A.update("products", [("id", f"eq.{pid}")], {"expires_at": "2099-01-01T00:00:00Z"}))
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

            # Ocultos y vencidos: solo los ve su dueño. Renovar reinicia los 60 días.
            for change in ({"hidden": True}, {"expires_at": "2020-01-01T00:00:00Z"}):
                await admin.update("products", [("id", f"eq.{pid}")], change)
                assert (await anon.select("products", [("id", f"eq.{pid}")]))[0] == []
                assert len((await A.select("products", [("id", f"eq.{pid}")]))[0]) == 1
                assert await anon.rpc("product_seller", {"product_id": pid}) is None
                await admin.update("products", [("id", f"eq.{pid}")], {"hidden": False})
            assert await fails(B.rpc("renew_product", {"product_id": pid}))
            await A.rpc("renew_product", {"product_id": pid})
            assert len((await anon.select("products", [("id", f"eq.{pid}")]))[0]) == 1

            # Varias fotos: alta, orden, quita y visibilidad según el anuncio.
            first, second = await photo(A, "green"), await photo(A, "blue")
            await A.rpc("set_product_images", {"product_id": pid, "paths": [first, second]})
            assert await fails(B.rpc("set_product_images", {"product_id": pid, "paths": []}))
            assert await fails(A.rpc("set_product_images", {"product_id": pid, "paths": [first, first]}))
            columns = "id,images:product_images(path,sort_order)"
            embedded = (await anon.select("products", [("id", f"eq.{pid}")], columns=columns))[0][0]["images"]
            assert {(i["path"], i["sort_order"]) for i in embedded} == {(first, 0), (second, 1)}
            assert await anon.download(BUCKET, second) is not None
            await fails(B.remove(BUCKET, [first]))
            assert await A.download(BUCKET, first) is not None
            assert await fails(B.upload(BUCKET, f"{a['id']}/{uuid.uuid4()}.webp", b"x", "image/webp"))
            third = await photo(A, "red")
            await A.rpc("set_product_images", {"product_id": pid, "paths": [third, second]})
            rows, _ = await A.select("product_images", [("product_id", f"eq.{pid}")], order="sort_order.asc")
            assert [row["path"] for row in rows] == [third, second]
            assert (await A.select("storage_cleanup", [("path", f"eq.{first}")]))[0][0]["ready"] is True
            await A.remove(BUCKET, [first])
            await A.delete("storage_cleanup", [("path", f"eq.{first}")])
            await A.update("products", [("id", f"eq.{pid}")], {"status": "pausado"})
            assert await anon.download(BUCKET, second) is None
            assert await B.download(BUCKET, second) is None
            await A.delete("products", [("id", f"eq.{pid}")])
            for path in (second, third):
                assert (await A.select("storage_cleanup", [("path", f"eq.{path}")]))[0][0]["ready"] is True
                await A.remove(BUCKET, [path])
                await A.delete("storage_cleanup", [("path", f"eq.{path}")])

            # Servicios: matrícula solo para los oficios que la exigen.
            service = {
                "owner_id": a["id"],
                "name": "Ana Gas",
                "trade_id": "gasista",
                "license_number": "1234",
                "license_body": "ENARGAS",
                "description": "Instalaciones de gas",
                "phone": "2644123456",
                "locality_id": "capital",
            }
            assert await fails(A.insert("service_providers", {**service, "license_number": None}))
            sid = (await A.insert("service_providers", service))[0]["id"]
            assert await fails(A.update("service_providers", [("id", f"eq.{sid}")], {"verified": True}))
            assert await fails(A.update("service_providers", [("id", f"eq.{sid}")], {"references_verified": True}))
            assert len((await anon.select("service_providers", [("id", f"eq.{sid}")]))[0]) == 1
            assert await B.update("service_providers", [("id", f"eq.{sid}")], {"name": "Hack"}) == []
            painter = (await A.insert("service_providers", {**service, "trade_id": "pintor"}))[0]
            assert painter["license_number"] is None and painter["license_body"] is None

            # Fotos del servicio: perfil y trabajos, visibles mientras el servicio está activo.
            avatar, work = await photo(A, "white"), await photo(A, "red")
            await A.rpc("set_service_images", {"service_provider_id": sid, "avatar": avatar, "works": [work]})
            assert await fails(B.rpc("set_service_images", {"service_provider_id": sid, "avatar": None, "works": []}))
            columns = "id,images:service_images(kind,path,sort_order)"
            embedded = (await anon.select("service_providers", [("id", f"eq.{sid}")], columns=columns))[0][0]["images"]
            assert {(i["kind"], i["path"]) for i in embedded} == {("perfil", avatar), ("trabajo", work)}
            assert await anon.download(BUCKET, avatar) is not None
            await A.update("service_providers", [("id", f"eq.{sid}")], {"status": "pausado"})
            assert await anon.download(BUCKET, work) is None
            assert await A.download(BUCKET, work) is not None

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
            print("OK: Supabase real, dos usuarios, listas, anuncios y servicios con fotos, vencimiento, RLS y Auth.")
            return 0
        finally:
            for user in users:
                try:
                    await remove_account(user["id"])
                except SupabaseError:
                    print("No se pudo limpiar el usuario temporal:", user["id"], file=sys.stderr)


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
