from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query

from ..config import PAGE_SIZE
from ..deps import CurrentUser, DbDep, UserDep
from ..schemas import ServiceSave, is_slug
from ..supabase import Supabase, SupabaseError
from .catalog import find, load_catalog
from .common import check_id, page_bounds, search_pattern

router = APIRouter(prefix="/services", tags=["servicios"])
COLUMNS = "*,trade:trades(name,requires_license),locality:localities(name)"
ORDER = "verified.desc,references_verified.desc,rating_score.desc,created_at.desc,id.desc"
NOT_FOUND = "Este servicio no está disponible."
SAVE_ERROR = (
    "No pudimos guardar el servicio. Puede haber cambiado en otra pestaña. Revisá la conexión e intentá nuevamente."
)


def shape(row: dict[str, Any]) -> dict[str, Any]:
    trade = row.get("trade") or {}
    plain = {key: value for key, value in row.items() if key not in ("trade", "locality")}
    return {
        **plain,
        "trade_name": trade.get("name"),
        "requires_license": bool(trade.get("requires_license")),
        "locality_name": (row.get("locality") or {}).get("name"),
    }


async def _payload(body: ServiceSave, db: Supabase) -> dict[str, Any]:
    catalog = await load_catalog(db)
    trade = find(catalog["trades"], body.trade_id)
    if not trade:
        raise HTTPException(422, "Elegí un oficio de la lista.")
    if not find(catalog["localities"], body.locality_id):
        raise HTTPException(422, "Elegí una localidad de la lista.")
    payload = body.model_dump(exclude={"version"})
    if not trade["requires_license"]:
        # La base descarta la matrícula de los oficios que no la exigen; se envía vacía para que coincida.
        payload.update(license_number=None, license_body=None)
    elif not (body.license_number and body.license_body):
        raise HTTPException(422, "Este oficio exige matrícula: ingresá el número y la entidad que la emitió.")
    return payload


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
    # RLS deja ver al dueño sus servicios ocultos: el listado público filtra la visibilidad explícitamente.
    filters = [("owner_id", f"eq.{user.id}")] if mine and user else [("status", "eq.activo"), ("hidden", "eq.false")]
    if pattern := search_pattern(q):
        filters.append(("name", pattern))
    if is_slug(trade):
        filters.append(("trade_id", f"eq.{trade}"))
    offset, size = page_bounds(page, limit)
    try:
        rows, count = await db.select(
            "service_providers", filters, columns=COLUMNS, order=ORDER, offset=offset, limit=size, count=True
        )
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar los servicios. Intentá nuevamente.") from error
    return {"items": [shape(row) for row in rows], "count": count or 0, "page": page, "page_size": size}


@router.get("/{service_id}")
async def get_service(service_id: str, db: DbDep) -> dict[str, Any]:
    check_id(service_id, NOT_FOUND)
    try:
        rows, _ = await db.select("service_providers", [("id", f"eq.{service_id}")], columns=COLUMNS, limit=1)
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar el servicio.") from error
    if not rows:
        raise HTTPException(404, NOT_FOUND)
    return shape(rows[0])


@router.post("", status_code=201)
async def create_service(body: ServiceSave, db: DbDep, user: UserDep) -> dict[str, Any]:
    payload = await _payload(body, db)
    try:
        saved = await db.insert("service_providers", {**payload, "owner_id": user.id})
    except SupabaseError as error:
        raise HTTPException(409, SAVE_ERROR) from error
    return {"id": saved[0]["id"]}


@router.put("/{service_id}")
async def update_service(service_id: str, body: ServiceSave, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(service_id, "Servicio inválido.")
    payload = await _payload(body, db)
    try:
        saved = await db.update(
            "service_providers",
            [("id", f"eq.{service_id}"), ("owner_id", f"eq.{user.id}"), ("updated_at", f"eq.{body.version}")],
            payload,
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
