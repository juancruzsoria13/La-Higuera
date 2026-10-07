"""Validación de entrada con mensajes en español de Argentina (equivalente a los esquemas zod)."""

import re
from typing import Any

from pydantic import BaseModel, ValidationInfo, field_validator

CATEGORIES = ("Tecnología", "Hogar", "Vehículos", "Otros")
PRODUCT_STATUSES = ("activo", "pausado", "vendido")
CURRENCIES = ("ARS", "USD")
CONDITIONS = ("nuevo", "usado")
TRADES = (
    "Gasista",
    "Plomero",
    "Electricista",
    "Albañil",
    "Pintor",
    "Carpintero",
    "Herrero",
    "Refrigeración",
    "Cerrajero",
    "Otros oficios",
)
SERVICE_STATUSES = ("activo", "pausado")
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)


def is_uuid(value: str) -> bool:
    return bool(UUID_RE.match(value))


def _text(value: Any, minimum: int, maximum: int, message: str) -> str:
    text = str(value or "").strip()
    if len(text) < minimum:
        raise ValueError(message)
    if len(text) > maximum:
        raise ValueError(f"Usá como máximo {maximum} caracteres.")
    return text


def _choice(value: Any, options: tuple[str, ...], message: str) -> str:
    if value not in options:
        raise ValueError(message)
    return value


class ProductIn(BaseModel):
    title: str
    description: str
    price: float
    currency: str
    category: str
    condition: str
    locality: str
    status: str

    @field_validator("*", mode="before")
    @classmethod
    def check(cls, value: Any, info: ValidationInfo) -> Any:
        match info.field_name:
            case "title":
                return _text(value, 3, 120, "El título debe tener al menos 3 caracteres.")
            case "description":
                return _text(value, 10, 5000, "Contanos un poco más: al menos 10 caracteres.")
            case "price":
                text = str(value or "").strip()
                if not re.fullmatch(r"\d{1,12}([.,]\d{1,2})?", text):
                    raise ValueError("Ingresá un precio válido, sin miles y con hasta 2 decimales.")
                return float(text.replace(",", "."))
            case "currency":
                return _choice(value, CURRENCIES, "Elegí una moneda válida.")
            case "category":
                return _choice(value, CATEGORIES, "Elegí una categoría válida.")
            case "condition":
                return _choice(value, CONDITIONS, "Elegí si el producto es nuevo o usado.")
            case "locality":
                return _text(value, 2, 80, "Ingresá tu localidad.")
            case "status":
                return _choice(value, PRODUCT_STATUSES, "Elegí un estado válido.")
        return value


class ServiceIn(BaseModel):
    name: str
    trade: str
    license_number: str
    license_body: str
    description: str
    phone: str
    locality: str
    status: str

    @field_validator("*", mode="before")
    @classmethod
    def check(cls, value: Any, info: ValidationInfo) -> Any:
        match info.field_name:
            case "name":
                return _text(value, 2, 100, "Ingresá el nombre con el que querés aparecer.")
            case "trade":
                return _choice(value, TRADES, "Elegí un oficio válido.")
            case "license_number":
                return _text(value, 2, 40, "Ingresá tu número de matrícula.")
            case "license_body":
                return _text(value, 2, 100, "Indicá qué entidad emitió la matrícula.")
            case "description":
                return _text(value, 10, 3000, "Contanos un poco más: al menos 10 caracteres.")
            case "phone":
                digits = re.sub(r"[\s().-]", "", str(value or "").strip()).removeprefix("+")
                if not re.fullmatch(r"\d{8,15}", digits):
                    raise ValueError("Ingresá un teléfono válido, con código de área y sin letras.")
                return digits
            case "locality":
                return _text(value, 2, 80, "Ingresá tu localidad.")
            case "status":
                return _choice(value, SERVICE_STATUSES, "Elegí un estado válido.")
        return value


class ServiceSave(ServiceIn):
    version: str = ""


class ProfileIn(BaseModel):
    display_name: str
    locality: str

    @field_validator("*", mode="before")
    @classmethod
    def check(cls, value: Any, info: ValidationInfo) -> Any:
        if info.field_name == "display_name":
            return _text(value, 2, 80, "El nombre debe tener al menos 2 caracteres.")
        return _text(value, 2, 80, "Ingresá una localidad.")


class AccountDeletion(BaseModel):
    confirmation: str
