import pytest
from pydantic import ValidationError

from app.schemas import ProductIn, ProfileIn, ServiceIn, is_uuid

VALID = {
    "title": "Bicicleta urbana",
    "description": "Bicicleta usada en buen estado",
    "price": "120000,50",
    "currency": "ARS",
    "category": "Otros",
    "condition": "usado",
    "locality": "Capital",
    "status": "activo",
}
SERVICE = {
    "name": "Juan Gas",
    "trade": "Gasista",
    "license_number": "1234",
    "license_body": "ENARGAS",
    "description": "Instalaciones de gas domiciliario",
    "phone": "+54 (264) 412-3456",
    "locality": "Capital",
    "status": "activo",
}


def test_acepta_decimales_argentinos_y_precio_cero():
    assert ProductIn.model_validate(VALID).price == 120000.5
    assert ProductIn.model_validate({**VALID, "price": "0"}).price == 0


@pytest.mark.parametrize("price", ["-1", "1e3", "NaN", "Infinity", "", "1.234", "1.000,00", "1000000000000"])
def test_rechaza_precios_invalidos(price):
    with pytest.raises(ValidationError):
        ProductIn.model_validate({**VALID, "price": price})


@pytest.mark.parametrize(
    "change",
    [
        {"title": " "},
        {"description": "corta"},
        {"category": "Empleo"},
        {"status": "borrado"},
        {"currency": "EUR"},
        {"condition": "roto"},
        {"locality": ""},
    ],
)
def test_rechaza_campos_invalidos(change):
    with pytest.raises(ValidationError):
        ProductIn.model_validate({**VALID, **change})


def test_mensajes_en_espanol():
    with pytest.raises(ValidationError) as error:
        ProductIn.model_validate({**VALID, "title": "ab"})
    assert error.value.errors()[0]["msg"] == "Value error, El título debe tener al menos 3 caracteres."


def test_descarta_propietarios_enviados_por_el_cliente():
    data = ProductIn.model_validate({**VALID, "owner_id": "attacker", "business_id": "other"}).model_dump()
    assert "owner_id" not in data and "business_id" not in data


def test_normaliza_telefono_y_valida_oficio():
    service = ServiceIn.model_validate(SERVICE)
    assert service.phone == "542644123456"
    with pytest.raises(ValidationError):
        ServiceIn.model_validate({**SERVICE, "trade": "Astronauta"})
    with pytest.raises(ValidationError):
        ServiceIn.model_validate({**SERVICE, "phone": "llamame"})


def test_servicio_no_acepta_verified_del_cliente():
    assert "verified" not in ServiceIn.model_validate({**SERVICE, "verified": True}).model_dump()


def test_perfil():
    assert ProfileIn.model_validate({"display_name": " Ana ", "locality": "Capital"}).display_name == "Ana"
    with pytest.raises(ValidationError):
        ProfileIn.model_validate({"display_name": "A", "locality": "Capital"})


def test_uuid():
    assert is_uuid("33333333-3333-4333-8333-333333333333")
    assert not is_uuid("../etc/passwd")
