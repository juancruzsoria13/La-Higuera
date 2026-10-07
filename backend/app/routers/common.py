from fastapi import HTTPException

from ..schemas import is_uuid


def search_pattern(q: str) -> str | None:
    """Patrón ILIKE literal para PostgREST: escapa comodines y quita `*`, que PostgREST traduce a `%`."""
    term = q.strip()[:120].replace("*", "")
    if not term:
        return None
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"ilike.*{escaped}*"


def page_bounds(page: int, size: int) -> tuple[int, int]:
    page = max(1, min(10000, page))
    return (page - 1) * size, size


def check_id(value: str, message: str) -> str:
    if not is_uuid(value):
        raise HTTPException(404, message)
    return value
