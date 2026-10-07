import re

from fastapi import APIRouter, Response

from ..config import BUCKET
from ..deps import DbDep

router = APIRouter(prefix="/images", tags=["imágenes"])
OWNER = re.compile(r"^[0-9a-f-]{36}$")
FILE = re.compile(r"^[0-9a-f-]{36}\.webp$")
PRIVATE = {"Cache-Control": "private, no-store"}


@router.get("/{owner}/{file}")
async def get_image(owner: str, file: str, db: DbDep) -> Response:
    if not OWNER.match(owner) or not FILE.match(file):
        return Response(status_code=404, headers=PRIVATE)
    # Las políticas de Storage solo entregan imágenes de anuncios activos o propios.
    data = await db.download(BUCKET, f"{owner}/{file}")
    if data is None:
        return Response(status_code=404, headers=PRIVATE)
    return Response(data, media_type="image/webp", headers={**PRIVATE, "X-Content-Type-Options": "nosniff"})
