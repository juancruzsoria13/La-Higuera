"""Validación de entrada con mensajes en español de Argentina (equivalente a los esquemas zod).

Rubros, localidades y oficios viven en tablas: acá solo se valida el formato del identificador;
los routers comprueban contra el catálogo que exista y esté activo.
"""

import re
from typing import Any

from pydantic import BaseModel, ValidationInfo, field_validator, model_validator

PRODUCT_STATUSES = ("activo", "pausado", "vendido")
CURRENCIES = ("ARS", "USD")
CONDITIONS = ("nuevo", "usado")
OPERATIONS = ("venta", "alquiler")
REAL_ESTATE = "inmuebles"
SERVICE_STATUSES = ("activo", "pausado")
MAX_IMAGES = 8
UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_MESSAGE = "Ingresá un teléfono válido, con código de área y sin letras."


def is_uuid(value: str) -> bool:
    return bool(UUID_RE.match(value))


def is_slug(value: str) -> bool:
    return len(value) <= 40 and bool(SLUG_RE.match(value))


def _text(value: Any, minimum: int, maximum: int, message: str) -> str:
    text = str(value or "").strip()
    if len(text) < minimum:
        raise ValueError(message)
    if len(text) > maximum:
        raise ValueError(f"Usá como máximo {maximum} caracteres.")
    return text


def _optional_text(value: Any, minimum: int, maximum: int, message: str) -> str | None:
    return _text(value, minimum, maximum, message) if str(value or "").strip() else None


def _choice(value: Any, options: tuple[str, ...], message: str) -> str:
    if value not in options:
        raise ValueError(message)
    return value


def _slug(value: Any, message: str) -> str:
    text = str(value or "").strip()
    if not is_slug(text):
        raise ValueError(message)
    return text


def _phone(value: Any, *, optional: bool = False) -> str | None:
    digits = re.sub(r"[\s().-]", "", str(value or "").strip()).removeprefix("+")
    if optional and not digits:
        return None
    if not re.fullmatch(r"\d{8,15}", digits):
        raise ValueError(PHONE_MESSAGE)
    return digits


def _email(value: Any) -> str | None:
    text = str(value or "").strip()
    if not text:
        return None
    if len(text) > 254 or not EMAIL_RE.match(text):
        raise ValueError("Ingresá un correo válido.")
    return text


class ProductIn(BaseModel):
    title: str
    description: str
    price: float
    currency: str
    category_id: str
    condition: str
    locality_id: str
    operation: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
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
            case "category_id":
                return _slug(value, "Elegí un rubro de la lista.")
            case "condition":
                return _choice(value, CONDITIONS, "Elegí si el producto es nuevo o usado.")
            case "locality_id":
                return _slug(value, "Elegí una localidad de la lista.")
            case "operation":
                text = str(value or "").strip()
                return _choice(text, OPERATIONS, "Elegí si es venta o alquiler.") if text else None
            case "contact_phone":
                return _phone(value, optional=True)
            case "contact_email":
                return _email(value)
            case "status":
                return _choice(value, PRODUCT_STATUSES, "Elegí un estado válido.")
        return value

    @model_validator(mode="after")
    def rules(self) -> "ProductIn":
        # Mismas reglas que products_operation_by_category y products_active_contact.
        if self.category_id == REAL_ESTATE and not self.operation:
            raise ValueError("Indicá si el inmueble es para venta o alquiler.")
        if self.category_id != REAL_ESTATE:
            self.operation = None
        if self.status == "activo" and not (self.contact_phone or self.contact_email):
            raise ValueError("Dejá un teléfono o un correo de contacto para publicar el anuncio.")
        return self


class ServiceIn(BaseModel):
    name: str
    trade_id: str
    license_number: str | None = None
    license_body: str | None = None
    description: str
    phone: str
    locality_id: str
    contact_email: str | None = None
    status: str

    @field_validator("*", mode="before")
    @classmethod
    def check(cls, value: Any, info: ValidationInfo) -> Any:
        match info.field_name:
            case "name":
                return _text(value, 2, 100, "Ingresá el nombre con el que querés aparecer.")
            case "trade_id":
                return _slug(value, "Elegí un oficio de la lista.")
            case "license_number":
                return _optional_text(value, 2, 40, "Ingresá tu número de matrícula.")
            case "license_body":
                return _optional_text(value, 2, 100, "Indicá qué entidad emitió la matrícula.")
            case "description":
                return _text(value, 10, 3000, "Contanos un poco más: al menos 10 caracteres.")
            case "phone":
                return _phone(value)
            case "locality_id":
                return _slug(value, "Elegí una localidad de la lista.")
            case "contact_email":
                return _email(value)
            case "status":
                return _choice(value, SERVICE_STATUSES, "Elegí un estado válido.")
        return value


class ServiceSave(ServiceIn):
    version: str = ""


class ProfileIn(BaseModel):
    display_name: str
    locality_id: str

    @field_validator("*", mode="before")
    @classmethod
    def check(cls, value: Any, info: ValidationInfo) -> Any:
        if info.field_name == "display_name":
            return _text(value, 2, 80, "El nombre debe tener al menos 2 caracteres.")
        return _slug(value, "Elegí una localidad de la lista.")


class AccountDeletion(BaseModel):
    confirmation: str
