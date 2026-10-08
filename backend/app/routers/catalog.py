import asyncio
from typing import Any

from fastapi import APIRouter, HTTPException

from ..deps import DbDep
from ..supabase import Supabase, SupabaseError

router = APIRouter(prefix="/catalog", tags=["listas"])
TABLES = {"categories": "id,name", "localities": "id,name", "trades": "id,name,requires_license"}


async def load_catalog(db: Supabase) -> dict[str, list[dict[str, Any]]]:
    """Rubros, localidades y oficios activos, en el orden de la base. Responde 502 si Supabase falla."""
    try:
        results = await asyncio.gather(
            *(
                db.select(table, [("active", "eq.true")], columns=columns, order="sort_order.asc,name.asc")
                for table, columns in TABLES.items()
            )
        )
    except SupabaseError as error:
        raise HTTPException(502, "No pudimos cargar las listas de rubros, oficios y localidades.") from error
    return {table: rows for table, (rows, _) in zip(TABLES, results, strict=True)}


def find(rows: list[dict[str, Any]], item_id: str) -> dict[str, Any] | None:
    return next((row for row in rows if row["id"] == item_id), None)


@router.get("")
async def get_catalog(db: DbDep) -> dict[str, list[dict[str, Any]]]:
    return await load_catalog(db)
