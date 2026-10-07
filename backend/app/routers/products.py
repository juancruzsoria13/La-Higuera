from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import ValidationError

from ..config import PAGE_SIZE
from ..deps import CurrentUser, DbDep, UserDep
from ..images import ImageError, clean_images, upload_image
from ..schemas import CATEGORIES, ProductIn
from ..supabase import SupabaseError
from .common import check_id, page_bounds, search_pattern

router = APIRouter(prefix="/products", tags=["anuncios"])
FIELDS = ("title", "description", "price", "currency", "category", "condition", "locality", "status")
NOT_FOUND = "Este anuncio no está disponible."


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
    filters = [("owner_id", f"eq.{user.id}")] if mine and user else [("status", "eq.activo")]
    if pattern := search_pattern(q):
        filters.append(("title", pattern))
    if category in CATEGORIES:
        filters.append(("category", f"eq.{category}"))
    offset, limit = page_bounds(page, PAGE_SIZE)
    try:
        rows, count = await db.select(
            "products", filters, order="created_at.desc,id.desc", offset=offset, limit=limit, count=True
        )
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar los anuncios. Intentá nuevamente.") from error
    return {"items": rows, "count": count or 0, "page": page, "page_size": PAGE_SIZE}


@router.get("/{product_id}")
async def get_product(product_id: str, db: DbDep) -> dict[str, Any]:
    check_id(product_id, NOT_FOUND)
    try:
        rows, _ = await db.select("products", [("id", f"eq.{product_id}")], limit=1)
        if not rows:
            raise HTTPException(404, NOT_FOUND)
        seller = await db.rpc("product_seller", {"product_id": product_id})
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar el anuncio.") from error
    return {**rows[0], "seller": seller}


async def _save(product_id: str | None, request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    form = await request.form()
    try:
        data = ProductIn.model_validate({name: form.get(name, "") for name in FIELDS})
    except ValidationError as error:
        raise HTTPException(422, error.errors()[0]["msg"].removeprefix("Value error, ")) from error
    version = str(form.get("version", ""))
    image_path: str | None = None
    if product_id:
        rows, _ = await db.select("products", [("id", f"eq.{product_id}"), ("owner_id", f"eq.{user.id}")], limit=1)
        if not rows:
            raise HTTPException(404, "No pudimos encontrar un anuncio tuyo con ese identificador.")
        if rows[0]["updated_at"] != version:
            raise HTTPException(409, "El anuncio cambió en otra pestaña. Recargá la página antes de guardar.")
        image_path = rows[0]["image_path"]
    if form.get("remove_image") == "on":
        image_path = None
    uploaded: str | None = None
    try:
        image = form.get("image")
        if image is not None and not isinstance(image, str) and image.size:
            uploaded = await upload_image(db, await image.read(), image.content_type or "")
            image_path = uploaded
        payload = {**data.model_dump(), "image_path": image_path}
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
    except (ImageError, SupabaseError) as error:
        if uploaded:
            await db.rpc("abandon_image", {"image": uploaded})
        await clean_images(db, user.id)
        if isinstance(error, ImageError):
            raise HTTPException(422, str(error)) from error
        raise HTTPException(
            409,
            "No pudimos guardar el anuncio. Puede haber cambiado en otra pestaña. "
            "Revisá la conexión e intentá nuevamente.",
        ) from error
    return {"id": saved[0]["id"], "clean": await clean_images(db, user.id)}


@router.post("", status_code=201)
async def create_product(request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    return await _save(None, request, db, user)


@router.put("/{product_id}")
async def update_product(product_id: str, request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(product_id, "Anuncio inválido.")
    return await _save(product_id, request, db, user)


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
