"""Catálogo de atributos compartido con el formulario mediante product_catalog.json."""

import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

CATALOG = json.loads(Path(__file__).with_name("product_catalog.json").read_text(encoding="utf-8"))
SUBCATEGORIES = {item["id"]: item for item in CATALOG["subcategories"]}
DEFINITIONS = CATALOG["attributes"]


def valid_maps_url(value: str) -> bool:
    try:
        url = urlsplit(value)
        return (
            url.scheme == "https"
            and not url.username
            and not url.password
            and (
                url.hostname in ("maps.app.goo.gl", "maps.google.com")
                or (url.hostname == "goo.gl" and url.path.startswith("/maps/"))
                or (
                    url.hostname in ("google.com", "www.google.com", "google.com.ar", "www.google.com.ar")
                    and (url.path == "/maps" or url.path.startswith("/maps/"))
                )
            )
        )
    except ValueError:
        return False


def validate_attributes(category: str, subcategory: str | None, values: Any) -> dict[str, str]:
    selected = SUBCATEGORIES.get(subcategory) if subcategory else None
    if subcategory and (not selected or selected["category_id"] != category):
        raise ValueError("Elegí una subcategoría del rubro seleccionado.")
    if isinstance(values, str):
        try:
            values = json.loads(values or "{}")
        except (ValueError, TypeError) as error:
            raise ValueError("Revisá las características del anuncio.") from error
    if not isinstance(values, dict):
        raise ValueError("Revisá las características del anuncio.")
    allowed = selected["attributes"] if selected else []
    result = {}
    for key, value in values.items():
        if key not in allowed:
            raise ValueError("Hay características que no corresponden a la subcategoría.")
        if not isinstance(value, str):
            raise ValueError("Revisá las características del anuncio.")
        value = value.strip()
        if not value:
            continue
        definition = DEFINITIONS[key]
        kind = definition["type"]
        valid = len(value) <= definition.get("maxLength", 120)
        if kind == "select":
            valid = value in [option["id"] for option in definition["options"]]
        elif kind == "number":
            pattern = r"\d{1,12}([.,]\d{1,2})?" if definition.get("step") == "0.01" else r"\d{1,12}"
            valid = bool(re.fullmatch(pattern, value))
            if valid:
                number = float(value.replace(",", "."))
                valid = definition["min"] <= number <= definition["max"]
                value = value.replace(",", ".")
        elif kind == "url":
            valid = valid and valid_maps_url(value)
        if not valid:
            raise ValueError(f"Revisá el campo {definition['label']}.")
        result[key] = value
    return result
