"""Normalización de imágenes de anuncios: se decodifican y se reescriben siempre como WebP."""

import warnings
from contextlib import suppress
from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps
from starlette.datastructures import UploadFile

from .config import BUCKET
from .schemas import MAX_IMAGES
from .supabase import Supabase, SupabaseError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 20_000_000
FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}
UNREADABLE = "No pudimos leer esa imagen. Usá un JPG, PNG o WebP válido, sin animación y de hasta 20 megapíxeles."


class ImageError(ValueError):
    pass


def normalize_image(data: bytes, content_type: str) -> bytes:
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageError("La imagen supera el límite de 5 MB.")
    if content_type not in FORMATS:
        raise ImageError("Usá una imagen JPG, PNG o WebP.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error")  # Pillow avisa con warnings ante archivos sospechosos.
            with Image.open(BytesIO(data)) as source:
                if source.format != FORMATS[content_type] or getattr(source, "n_frames", 1) > 1:
                    raise ImageError(UNREADABLE)
                if source.width * source.height > MAX_PIXELS:
                    raise ImageError(UNREADABLE)
                source.load()
                image = ImageOps.exif_transpose(source)
        image.thumbnail((1600, 1600))
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
        output = BytesIO()
        image.save(output, "WEBP", quality=82)
    except ImageError:
        raise
    except Exception as error:
        raise ImageError(UNREADABLE) from error
    result = output.getvalue()
    if len(result) > MAX_IMAGE_BYTES:
        raise ImageError(UNREADABLE)
    return result


async def upload_image(db: Supabase, data: bytes, content_type: str) -> str:
    webp = normalize_image(data, content_type)
    try:
        path = await db.rpc("reserve_image")
    except SupabaseError as error:
        raise ImageError("No pudimos preparar la imagen. Intentá nuevamente.") from error
    if not path:
        raise ImageError("No pudimos preparar la imagen. Intentá nuevamente.")
    try:
        await db.upload(BUCKET, path, webp, "image/webp")
    except SupabaseError as error:
        await db.rpc("abandon_image", {"image": path})
        raise ImageError(
            "No pudimos subir la imagen. Tus datos siguen en el formulario; volvé a seleccionar el archivo."
        ) from error
    return path


async def clean_images(db: Supabase, owner_id: str) -> bool:
    """Borra imágenes reemplazadas o abandonadas del propietario. Devuelve False si quedó algo pendiente."""
    try:
        rows, _ = await db.select("storage_cleanup", [("owner_id", f"eq.{owner_id}"), ("ready", "eq.true")], limit=100)
    except SupabaseError:
        return False
    complete = True
    for row in rows:
        try:
            await db.remove(BUCKET, [row["path"]])
            await db.delete("storage_cleanup", [("path", f"eq.{row['path']}"), ("owner_id", f"eq.{owner_id}")])
        except SupabaseError:
            complete = False
    return complete


def image_order(order: list[str], current: list[str], files: list[UploadFile], noun: str) -> list[str]:
    """Lista final de fotos: rutas que ya están guardadas o `new:<i>` para el archivo i de `images`."""
    invalid = f"Revisá las fotos del {noun}: recargá la página y volvé a elegirlas."
    if not order:
        order = [*current, *(f"new:{index}" for index in range(len(files)))]
    if len(order) > MAX_IMAGES or len(files) > MAX_IMAGES:
        raise HTTPException(422, f"Podés subir hasta {MAX_IMAGES} fotos por {noun}.")
    if len(set(order)) != len(order):
        raise HTTPException(422, invalid)
    for token in order:
        index = token.removeprefix("new:")
        if token.startswith("new:") and not (index.isdigit() and int(index) < len(files)):
            raise HTTPException(422, invalid)
        if not token.startswith("new:") and token not in current:
            raise HTTPException(422, invalid)
    return order


async def abandon_images(db: Supabase, paths: list[str]) -> None:
    # Si falla, la reserva vence a las 24 h y la reclama scripts/cleanup.py.
    for path in paths:
        with suppress(SupabaseError):
            await db.rpc("abandon_image", {"image": path})
