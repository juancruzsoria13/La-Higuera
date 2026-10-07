import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from ..config import BUCKET
from ..deps import AdminDbDep, DbDep, UserDep
from ..schemas import AccountDeletion, ProfileIn
from ..supabase import SupabaseError

router = APIRouter(tags=["cuenta"])
log = logging.getLogger(__name__)


@router.get("/profile")
async def get_profile(db: DbDep, user: UserDep) -> dict[str, Any]:
    try:
        rows, _ = await db.select("profiles", [("id", f"eq.{user.id}")], limit=1)
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar tu perfil.") from error
    if not rows:
        raise HTTPException(404, "No pudimos cargar tu perfil.")
    return {"display_name": rows[0]["display_name"], "locality": rows[0]["locality"], "email": user.email}


@router.put("/profile")
async def update_profile(body: ProfileIn, db: DbDep, user: UserDep) -> dict[str, Any]:
    message = "No pudimos guardar tu perfil. Si empezaste a eliminar la cuenta, volvé a intentar esa operación."
    try:
        saved = await db.update("profiles", [("id", f"eq.{user.id}")], body.model_dump())
    except SupabaseError as error:
        raise HTTPException(409, message) from error
    if not saved:
        raise HTTPException(409, message)
    return {"display_name": saved[0]["display_name"], "locality": saved[0]["locality"]}


@router.post("/account/delete")
async def delete_account(body: AccountDeletion, db: DbDep, admin: AdminDbDep, user: UserDep) -> dict[str, Any]:
    if body.confirmation != "ELIMINAR":
        raise HTTPException(422, "Escribí ELIMINAR para confirmar.")
    try:
        # Congela la cuenta antes de borrar archivos: las escrituras en curso quedan rechazadas.
        await db.rpc("begin_account_deletion")
        # Supabase exige borrar los objetos de Storage propios antes de eliminar auth.users.
        while files := await admin.list_objects(BUCKET, user.id):
            await admin.remove(BUCKET, [f"{user.id}/{file['name']}" for file in files])
        await admin.admin_delete_user(user.id)
        # El borrado en Auth elimina en cascada perfil, comercios, anuncios y servicios.
        await admin.delete("storage_cleanup", [("owner_id", f"eq.{user.id}")])
    except SupabaseError as error:
        log.error("Account deletion failed: %s", error.status)
        raise HTTPException(
            502,
            "No pudimos completar la eliminación. La cuenta puede haber quedado bloqueada para cambios y "
            "algunas imágenes eliminadas. Volvé a confirmar para reintentar.",
        ) from error
    return {"deleted": True}
