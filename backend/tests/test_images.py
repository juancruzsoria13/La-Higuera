from io import BytesIO

import pytest
from PIL import Image

from app.images import MAX_IMAGE_BYTES, ImageError, normalize_image


def png(width=20, height=10) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (width, height), "red").save(buffer, "PNG")
    return buffer.getvalue()


def test_convierte_a_webp_sin_metadatos():
    output = normalize_image(png(), "image/png")
    with Image.open(BytesIO(output)) as image:
        assert image.format == "WEBP"
        assert "exif" not in image.info


def test_reduce_imagenes_grandes():
    with Image.open(BytesIO(normalize_image(png(3200, 800), "image/png"))) as image:
        assert image.size == (1600, 400)


def test_rechaza_texto_disfrazado():
    with pytest.raises(ImageError, match="No pudimos leer"):
        normalize_image(b"no es una foto", "image/jpeg")


def test_rechaza_mime_falso_con_imagen_valida():
    with pytest.raises(ImageError):
        normalize_image(png(2, 2), "image/jpeg")


def test_rechaza_svg_y_archivos_grandes():
    with pytest.raises(ImageError, match="JPG"):
        normalize_image(b"<svg/>", "image/svg+xml")
    with pytest.raises(ImageError, match="5 MB"):
        normalize_image(bytes(MAX_IMAGE_BYTES + 1), "image/png")


def test_rechaza_animaciones():
    frames = [Image.new("RGB", (4, 4), color) for color in ("red", "blue")]
    buffer = BytesIO()
    frames[0].save(buffer, "WEBP", save_all=True, append_images=frames[1:])
    with pytest.raises(ImageError):
        normalize_image(buffer.getvalue(), "image/webp")
