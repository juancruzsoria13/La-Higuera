"""Carga anuncios y servicios de ejemplo en el Supabase LOCAL para ver la home con contenido.

Uso (desde backend/, con backend/.env apuntando al Supabase local):
    .venv/bin/python -m scripts.seed_demo            # borra los datos demo anteriores y los vuelve a crear
    .venv/bin/python -m scripts.seed_demo --borrar   # solo borra los datos demo

Los datos están en seed_demo.json y son de usuarios demo-*@demo.lahiguera.test; no toca nada más.
Se niega a correr si SUPABASE_URL no es localhost. Las fotos son rutas relativas a la raíz del repo;
los anuncios sin foto muestran la ilustración del rubro.
"""

import argparse
import asyncio
import json
import secrets
import sys
from io import BytesIO
from pathlib import Path
from urllib.parse import urlparse

import httpx
from PIL import Image, ImageOps

from app.config import BUCKET, get_settings
from app.supabase import Supabase

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(__file__).with_name("seed_demo.json")
DOMAIN = "demo.lahiguera.test"


def phone(index: int) -> str:
    return f"264{5_000_000 + index * 7_919:07d}"


async def remove(admin: Supabase) -> int:
    response = await admin._request("GET", "/auth/v1/admin/users", params={"per_page": 1000})
    users = [user for user in response.json()["users"] if (user.get("email") or "").endswith(f"@{DOMAIN}")]
    for user in users:
        while files := await admin.list_objects(BUCKET, user["id"]):
            await admin.remove(BUCKET, [f"{user['id']}/{file['name']}" for file in files])
        await admin.admin_delete_user(user["id"])
        await admin.delete("storage_cleanup", [("owner_id", f"eq.{user['id']}")])
    return len(users)


async def photo(db: Supabase, relative: str) -> str:
    image = ImageOps.exif_transpose(Image.open(ROOT / relative)).convert("RGB")
    image.thumbnail((1600, 1600))
    buffer = BytesIO()
    image.save(buffer, "WEBP", quality=80)
    path = await db.rpc("reserve_image")
    await db.upload(BUCKET, path, buffer.getvalue(), "image/webp")
    return path


async def seed(http: httpx.AsyncClient, admin: Supabase, url: str, key: str, data: dict) -> None:
    sellers: dict[str, tuple[str, str, Supabase]] = {}
    for seller in data["sellers"]:
        email, password = f"demo-{seller['slug']}@{DOMAIN}", secrets.token_urlsafe(18)
        account = {"email": email, "password": password, "email_confirm": True}
        created = await admin._request(
            "POST", "/auth/v1/admin/users", json={**account, "user_metadata": {"display_name": seller["name"]}}
        )
        user_id = created.json()["id"]
        token = await http.post(
            f"{url}/auth/v1/token", params={"grant_type": "password"}, headers={"apikey": key}, json=account
        )
        token.raise_for_status()
        db = Supabase(http, url, key, token.json()["access_token"])
        await db.update("profiles", [("id", f"eq.{user_id}")], {"locality_id": seller["locality_id"]})
        sellers[seller["slug"]] = (user_id, seller["locality_id"], db)

    # Se insertan en orden: el último queda primero en "Más recientes".
    for index, item in enumerate(data["products"]):
        user_id, locality, db = sellers[item["seller"]]
        row = {field: value for field, value in item.items() if field not in {"seller", "photos", "offer_price"}}
        row |= {"owner_id": user_id, "locality_id": locality, "contact_phone": phone(index), "status": "activo"}
        product = (await db.insert("products", row))[0]
        if item.get("offer_price"):
            # Se baja el precio como lo haría el vendedor: la base guarda el anterior y el anuncio pasa a Ofertas.
            await db.update("products", [("id", f"eq.{product['id']}")], {"price": item["offer_price"]})
        if item.get("photos"):
            paths = [await photo(db, relative) for relative in item["photos"]]
            await db.rpc("set_product_images", {"product_id": product["id"], "paths": paths})
    for index, item in enumerate(data["services"]):
        user_id, _, db = sellers[item["seller"]]
        row = {field: value for field, value in item.items() if field not in {"seller", "avatar", "works"}}
        row |= {"owner_id": user_id, "phone": phone(100 + index), "status": "activo"}
        service = (await db.insert("service_providers", row))[0]
        if item.get("avatar") or item.get("works"):
            avatar = await photo(db, item["avatar"]) if item.get("avatar") else None
            works = [await photo(db, relative) for relative in item.get("works", [])]
            images = {"service_provider_id": service["id"], "avatar": avatar, "works": works}
            await db.rpc("set_service_images", images)


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--borrar", action="store_true", help="solo borra los datos demo")
    args = parser.parse_args()
    settings = get_settings()
    if urlparse(settings.supabase_url).hostname not in {"127.0.0.1", "localhost"}:
        print("SUPABASE_URL no es local: este script solo corre contra el Supabase de desarrollo.", file=sys.stderr)
        return 1
    if not settings.admin_configured:
        print("Falta SUPABASE_SERVICE_ROLE_KEY en backend/.env.", file=sys.stderr)
        return 1
    data = json.loads(DATA.read_text(encoding="utf-8"))
    async with httpx.AsyncClient(timeout=30) as http:
        admin = Supabase(http, settings.supabase_url, settings.supabase_service_role_key)
        print(f"Borrados {await remove(admin)} usuarios demo anteriores.")
        if args.borrar:
            return 0
        await seed(http, admin, settings.supabase_url, settings.supabase_publishable_key, data)
    print(f"Cargados {len(data['products'])} anuncios y {len(data['services'])} servicios de prueba.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
