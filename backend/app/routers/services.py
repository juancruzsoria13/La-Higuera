from contextlib import suppress
from typing import Annotated, Any

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import ValidationError
from starlette.datastructures import UploadFile

from ..config import PAGE_SIZE
from ..deps import CurrentUser, DbDep, UserDep
from ..images import ImageError, abandon_images, clean_images, image_order, upload_image
from ..schemas import ServiceSave, is_slug
from ..supabase import Supabase, SupabaseError
from .catalog import find, load_catalog
from .common import check_id, page_bounds, search_pattern

router = APIRouter(prefix="/services", tags=["servicios"])
FIELDS = (
    "name",
    "trade_id",
    "license_number",
    "license_body",
    "description",
    "phone",
    "locality_id",
    "contact_email",
    "status",
)
# Fotos (perfil y trabajos) y nombres de oficio y localidad embebidos; RLS se aplica a cada tabla.
COLUMNS = "*,trade:trades(name,requires_license),locality:localities(name),images:service_images(kind,path,sort_order)"
ORDER = "verified.desc,references_verified.desc,rating_score.desc,created_at.desc,id.desc"
NOT_FOUND = "Este servicio no está disponible."
SAVE_ERROR = (
    "No pudimos guardar el servicio. Puede haber cambiado en otra pestaña. Revisá la conexión e intentá nuevamente."
)


def _photos(row: dict[str, Any]) -> tuple[str | None, list[str]]:
    """Foto de perfil y fotos de trabajos (en orden) de una fila con `images` embebido."""
    images = sorted(row.get("images") or [], key=lambda image: image["sort_order"])
    avatar = next((image["path"] for image in images if image["kind"] == "perfil"), None)
    return avatar, [image["path"] for image in images if image["kind"] == "trabajo"]


def shape(row: dict[str, Any]) -> dict[str, Any]:
    trade = row.get("trade") or {}
    avatar, works = _photos(row)
    plain = {key: value for key, value in row.items() if key not in ("trade", "locality", "images")}
    return {
        **plain,
        "trade_name": trade.get("name"),
        "requires_license": bool(trade.get("requires_license")),
        "locality_name": (row.get("locality") or {}).get("name"),
        "avatar": avatar,
        "work_images": works,
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


async def _save(service_id: str | None, request: Request, db: Supabase, user: UserDep) -> dict[str, Any]:
    form = await request.form()
    try:
        body = ServiceSave.model_validate(
            {**{name: form.get(name, "") for name in FIELDS}, "version": str(form.get("version", ""))}
        )
    except ValidationError as error:
        raise HTTPException(422, error.errors()[0]["msg"].removeprefix("Value error, ")) from error
    payload = await _payload(body, db)
    current_avatar: str | None = None
    current: list[str] = []
    if service_id:
        rows, _ = await db.select(
            "service_providers",
            [("id", f"eq.{service_id}"), ("owner_id", f"eq.{user.id}")],
            columns="id,updated_at,images:service_images(kind,path,sort_order)",
            limit=1,
        )
        if not rows:
            raise HTTPException(404, "No pudimos encontrar un servicio tuyo con ese identificador.")
        if rows[0]["updated_at"] != body.version:
            raise HTTPException(409, "El servicio cambió en otra pestaña. Recargá la página antes de guardar.")
        current_avatar, current = _photos(rows[0])
    files = [file for file in form.getlist("images") if isinstance(file, UploadFile) and file.size]
    order = image_order([str(token) for token in form.getlist("image_order")], current, files, "servicio")
    # `avatar`: la ruta de la foto de perfil actual, "new" para el archivo `avatar_file` o vacío para no tener.
    avatar_choice = str(form.get("avatar", current_avatar or ""))
    avatar_file = form.get("avatar_file")
    if avatar_choice == "new" and not (isinstance(avatar_file, UploadFile) and avatar_file.size):
        raise HTTPException(422, "Elegí de nuevo tu foto de perfil.")
    if avatar_choice not in ("", "new", current_avatar):
        raise HTTPException(422, "Revisá las fotos del servicio: recargá la página y volvé a elegirlas.")
    uploaded: dict[str, str] = {}
    saved_id: str | None = None
    try:
        for token in order:
            if token.startswith("new:"):
                file = files[int(token.removeprefix("new:"))]
                uploaded[token] = await upload_image(db, await file.read(), file.content_type or "")
        if avatar_choice == "new" and isinstance(avatar_file, UploadFile):
            uploaded["avatar"] = await upload_image(db, await avatar_file.read(), avatar_file.content_type or "")
        works = [uploaded.get(token, token) for token in order]
        avatar = uploaded["avatar"] if avatar_choice == "new" else avatar_choice or None
        if service_id:
            saved = await db.update(
                "service_providers",
                [("id", f"eq.{service_id}"), ("owner_id", f"eq.{user.id}"), ("updated_at", f"eq.{body.version}")],
                payload,
            )
        else:
            saved = await db.insert("service_providers", {**payload, "owner_id": user.id})
        if not saved:
            raise SupabaseError(409, "sin filas")
        saved_id = saved[0]["id"]
        # Agrega, reordena y quita fotos en una sola transacción de la base.
        if works != current or avatar != current_avatar:
            await db.rpc("set_service_images", {"service_provider_id": saved_id, "avatar": avatar, "works": works})
    except (ImageError, SupabaseError) as error:
        await abandon_images(db, list(uploaded.values()))
        if saved_id and not service_id:
            # Un alta sin sus fotos no queda publicada a medias: se deshace y el formulario conserva los datos.
            with suppress(SupabaseError):
                await db.delete("service_providers", [("id", f"eq.{saved_id}"), ("owner_id", f"eq.{user.id}")])
        await clean_images(db, user.id)
        if isinstance(error, ImageError):
            raise HTTPException(422, str(error)) from error
        if saved_id and service_id:
            raise HTTPException(
                409, "Guardamos los datos del servicio, pero no las fotos. Recargá la página y volvé a elegirlas."
            ) from error
        raise HTTPException(409, SAVE_ERROR) from error
    return {"id": saved_id, "clean": await clean_images(db, user.id)}


@router.post("", status_code=201)
async def create_service(request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    return await _save(None, request, db, user)


@router.put("/{service_id}")
async def update_service(service_id: str, request: Request, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(service_id, "Servicio inválido.")
    return await _save(service_id, request, db, user)


@router.delete("/{service_id}")
async def delete_service(service_id: str, db: DbDep, user: UserDep) -> dict[str, Any]:
    check_id(service_id, "Servicio inválido.")
    try:
        deleted = await db.delete("service_providers", [("id", f"eq.{service_id}"), ("owner_id", f"eq.{user.id}")])
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos eliminar el servicio. Intentá nuevamente.") from error
    if not deleted:
        raise HTTPException(404, "No pudimos eliminar el servicio. Intentá nuevamente.")
    # El borrado arrastra sus fotos, que quedan en la cola de limpieza.
    return {"deleted": True, "clean": await clean_images(db, user.id)}
