from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from ..config import PAGE_SIZE
from ..deps import CurrentUser, DbDep, UserDep
from ..schemas import TRADES, ServiceSave
from ..supabase import SupabaseError
from .common import check_id, page_bounds, search_pattern

router = APIRouter(prefix="/services", tags=["servicios"])
NOT_FOUND = "Este servicio no está disponible."
SAVE_ERROR = (
    "No pudimos guardar el servicio. Puede haber cambiado en otra pestaña. Revisá la conexión e intentá nuevamente."
)


@router.get("")
async def list_services(
    db: DbDep,
    user: CurrentUser,
    q: str = "",
    trade: str = "",
    page: Annotated[int, Query(ge=1, le=10000)] = 1,
    limit: Annotated[int, Query(ge=1, le=PAGE_SIZE)] = PAGE_SIZE,
    mine: bool = False,
) -> dict[str, Any]:
    if mine and not user:
        raise HTTPException(401, "Ingresá a tu cuenta para continuar.")
    filters = [("owner_id", f"eq.{user.id}")] if mine and user else [("status", "eq.activo")]
    if pattern := search_pattern(q):
        filters.append(("name", pattern))
    if trade in TRADES:
        filters.append(("trade", f"eq.{trade}"))
    offset, size = page_bounds(page, limit)
    try:
        rows, count = await db.select(
            "service_providers",
            filters,
            order="verified.desc,created_at.desc,id.desc",
            offset=offset,
            limit=size,
            count=True,
        )
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar los servicios. Intentá nuevamente.") from error
    return {"items": rows, "count": count or 0, "page": page, "page_size": size}


@router.get("/{service_id}")
async def get_service(service_id: str, db: DbDep) -> dict[str, Any]:
    check_id(service_id, NOT_FOUND)
    try:
        rows, _ = await db.select("service_providers", [("id", f"eq.{service_id}")], limit=1)
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar el servicio.") from error
    if not rows:
        raise HTTPException(404, NOT_FOUND)
    return rows[0]


@router.post("", status_code=201)
async def create_service(body: ServiceSave, db: DbDep, user: UserDep) -> dict[str, Any]:
    try:
        saved = await db.insert("service_providers", {**body.model_dump(exclude={"version"}), "owner_id": user.id})
    except SupabaseError as error:
        raise HTTPException(409, SAVE_ERROR) from error
    return {"id": saved[0]["id"]}


@router.put("/{service_id}")
async def update_service(service_id: str, body: ServiceSave, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(service_id, "Servicio inválido.")
    try:
        saved = await db.update(
            "service_providers",
            [("id", f"eq.{service_id}"), ("owner_id", f"eq.{user.id}"), ("updated_at", f"eq.{body.version}")],
            body.model_dump(exclude={"version"}),
        )
    except SupabaseError as error:
        raise HTTPException(409, SAVE_ERROR) from error
    if not saved:
        raise HTTPException(409, SAVE_ERROR)
    return {"id": saved[0]["id"]}


@router.delete("/{service_id}")
async def delete_service(service_id: str, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(service_id, "Servicio inválido.")
    try:
        deleted = await db.delete("service_providers", [("id", f"eq.{service_id}"), ("owner_id", f"eq.{user.id}")])
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos eliminar el servicio. Intentá nuevamente.") from error
    if not deleted:
        raise HTTPException(404, "No pudimos eliminar el servicio. Intentá nuevamente.")
    return {"deleted": True}
