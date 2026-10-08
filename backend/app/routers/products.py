from contextlib import suppress
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import ValidationError
from starlette.datastructures import UploadFile

from ..config import PAGE_SIZE
from ..deps import CurrentUser, DbDep, UserDep
from ..images import ImageError, clean_images, upload_image
from ..schemas import MAX_IMAGES, ProductIn, is_slug
from ..supabase import Supabase, SupabaseError
from .catalog import find, load_catalog
from .common import check_id, page_bounds, search_pattern

router = APIRouter(prefix="/products", tags=["anuncios"])
FIELDS = (
    "title",
    "description",
    "price",
    "currency",
    "category_id",
    "condition",
    "locality_id",
    "operation",
    "contact_phone",
    "contact_email",
    "status",
)
# Fotos embebidas y nombres de rubro y localidad, en una sola consulta (RLS se aplica a cada tabla).
COLUMNS = "*,images:product_images(path,sort_order),category:categories(name),locality:localities(name)"
NOT_FOUND = "Este anuncio no está disponible."
IMAGES_INVALID = "Revisá las fotos del anuncio: recargá la página y volvé a elegirlas."
SAVE_ERROR = (
    "No pudimos guardar el anuncio. Puede haber cambiado en otra pestaña. Revisá la conexión e intentá nuevamente."
)


def _paths(row: dict[str, Any]) -> list[str]:
    return [image["path"] for image in sorted(row.get("images") or [], key=lambda image: image["sort_order"])]


def shape(row: dict[str, Any]) -> dict[str, Any]:
    """Aplana lo embebido: `images` queda como lista de rutas, con la portada primero."""
    plain = {key: value for key, value in row.items() if key not in ("images", "category", "locality")}
    return {
        **plain,
        "images": _paths(row),
        "category_name": (row.get("category") or {}).get("name"),
        "locality_name": (row.get("locality") or {}).get("name"),
    }


@router.get("")
async def list_products(
    db: DbDep,
    user: CurrentUser,
    q: str = "",
    category: str = "",
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    mine: bool = False,
) -> dict[str, Any]:
    if mine and not user:
        raise HTTPException(401, "Ingresá a tu cuenta para continuar.")
    if mine and user:
        filters = [("owner_id", f"eq.{user.id}")]
    else:
        # RLS también deja ver al dueño sus anuncios pausados, ocultos o vencidos: el listado público
        # filtra las tres condiciones de visibilidad de forma explícita.
        now = datetime.now(UTC).isoformat()
        filters = [("status", "eq.activo"), ("hidden", "eq.false"), ("expires_at", f"gt.{now}")]
    if pattern := search_pattern(q):
        filters.append(("title", pattern))
    if is_slug(category):
        filters.append(("category_id", f"eq.{category}"))
    offset, limit = page_bounds(page, PAGE_SIZE)
    try:
        rows, count = await db.select(
            "products",
            filters,
            columns=COLUMNS,
            order="created_at.desc,id.desc",
            offset=offset,
            limit=limit,
            count=True,
        )
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar los anuncios. Intentá nuevamente.") from error
    return {"items": [shape(row) for row in rows], "count": count or 0, "page": page, "page_size": PAGE_SIZE}


@router.get("/{product_id}")
async def get_product(product_id: str, db: DbDep) -> dict[str, Any]:
    check_id(product_id, NOT_FOUND)
    try:
        rows, _ = await db.select("products", [("id", f"eq.{product_id}")], columns=COLUMNS, limit=1)
        if not rows:
            raise HTTPException(404, NOT_FOUND)
        seller = await db.rpc("product_seller", {"product_id": product_id})
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar el anuncio.") from error
    return {**shape(rows[0]), "seller": seller}


def _image_order(order: list[str], current: list[str], files: list[UploadFile]) -> list[str]:
    """Lista final de fotos: rutas que ya tiene el anuncio o `new:<i>` para el archivo i de `images`."""
    if not order:
        order = [*current, *(f"new:{index}" for index in range(len(files)))]
    if len(order) > MAX_IMAGES or len(files) > MAX_IMAGES:
        raise HTTPException(422, f"Podés subir hasta {MAX_IMAGES} fotos por anuncio.")
    if len(set(order)) != len(order):
        raise HTTPException(422, IMAGES_INVALID)
    for token in order:
        index = token.removeprefix("new:")
        if token.startswith("new:") and not (index.isdigit() and int(index) < len(files)):
            raise HTTPException(422, IMAGES_INVALID)
        if not token.startswith("new:") and token not in current:
            raise HTTPException(422, IMAGES_INVALID)
    return order


async def _abandon(db: Supabase, paths: list[str]) -> None:
    # Si falla, la reserva vence a las 24 h y la reclama scripts/cleanup.py.
    for path in paths:
        with suppress(SupabaseError):
            await db.rpc("abandon_image", {"image": path})


async def _save(product_id: str | None, request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    form = await request.form()
    try:
        data = ProductIn.model_validate({name: form.get(name, "") for name in FIELDS})
    except ValidationError as error:
        raise HTTPException(422, error.errors()[0]["msg"].removeprefix("Value error, ")) from error
    catalog = await load_catalog(db)
    if not find(catalog["categories"], data.category_id):
        raise HTTPException(422, "Elegí un rubro de la lista.")
    if not find(catalog["localities"], data.locality_id):
        raise HTTPException(422, "Elegí una localidad de la lista.")
    version = str(form.get("version", ""))
    current: list[str] = []
    if product_id:
        rows, _ = await db.select(
            "products",
            [("id", f"eq.{product_id}"), ("owner_id", f"eq.{user.id}")],
            columns="id,updated_at,images:product_images(path,sort_order)",
            limit=1,
        )
        if not rows:
            raise HTTPException(404, "No pudimos encontrar un anuncio tuyo con ese identificador.")
        if rows[0]["updated_at"] != version:
            raise HTTPException(409, "El anuncio cambió en otra pestaña. Recargá la página antes de guardar.")
        current = _paths(rows[0])
    files = [file for file in form.getlist("images") if isinstance(file, UploadFile) and file.size]
    order = _image_order([str(token) for token in form.getlist("image_order")], current, files)
    uploaded: dict[str, str] = {}
    saved_id: str | None = None
    try:
        for token in order:
            if token.startswith("new:"):
                file = files[int(token.removeprefix("new:"))]
                uploaded[token] = await upload_image(db, await file.read(), file.content_type or "")
        paths = [uploaded.get(token, token) for token in order]
        payload = data.model_dump()
        if product_id:
            saved = await db.update(
                "products",
                [("id", f"eq.{product_id}"), ("owner_id", f"eq.{user.id}"), ("updated_at", f"eq.{version}")],
                payload,
            )
        else:
            saved = await db.insert("products", {**payload, "owner_id": user.id, "business_id": None})
        if not saved:
            raise SupabaseError(409, "sin filas")
        saved_id = saved[0]["id"]
        # Agrega, reordena y quita fotos en una sola transacción de la base.
        if paths != current:
            await db.rpc("set_product_images", {"product_id": saved_id, "paths": paths})
    except (ImageError, SupabaseError) as error:
        await _abandon(db, list(uploaded.values()))
        if saved_id and not product_id:
            # Un alta sin sus fotos no queda publicada a medias: se deshace y el formulario conserva los datos.
            with suppress(SupabaseError):
                await db.delete("products", [("id", f"eq.{saved_id}"), ("owner_id", f"eq.{user.id}")])
        await clean_images(db, user.id)
        if isinstance(error, ImageError):
            raise HTTPException(422, str(error)) from error
        if saved_id and product_id:
            raise HTTPException(
                409, "Guardamos los datos del anuncio, pero no las fotos. Recargá la página y volvé a elegirlas."
            ) from error
        raise HTTPException(409, SAVE_ERROR) from error
    return {"id": saved_id, "clean": await clean_images(db, user.id)}


@router.post("", status_code=201)
async def create_product(request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    return await _save(None, request, db, user)


@router.put("/{product_id}")
async def update_product(product_id: str, request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(product_id, "Anuncio inválido.")
    return await _save(product_id, request, db, user)


@router.post("/{product_id}/renew")
async def renew_product(product_id: str, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(product_id, "Anuncio inválido.")
    try:
        expires_at = await db.rpc("renew_product", {"product_id": product_id})
    except SupabaseError as error:
        raise HTTPException(409, "No pudimos renovar el anuncio. Intentá nuevamente.") from error
    return {"expires_at": expires_at}


@router.delete("/{product_id}")
async def delete_product(product_id: str, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(product_id, "Anuncio inválido.")
    try:
        deleted = await db.delete("products", [("id", f"eq.{product_id}"), ("owner_id", f"eq.{user.id}")])
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos eliminar el anuncio. Intentá nuevamente.") from error
    if not deleted:
        raise HTTPException(404, "No pudimos eliminar el anuncio. Intentá nuevamente.")
    return {"clean": await clean_images(db, user.id)}
