import pytest
from pydantic import ValidationError

from app.schemas import ProductIn, ProfileIn, ServiceIn, is_slug, is_uuid

VALID = {
    "title": "Bicicleta urbana",
    "description": "Bicicleta usada en buen estado",
    "price": "120000,50",
    "currency": "ARS",
    "category_id": "otros",
    "condition": "usado",
    "locality_id": "capital",
    "contact_phone": "+54 (264) 412-3456",
    "status": "activo",
}
SERVICE = {
    "name": "Juan Gas",
    "trade_id": "gasista",
    "license_number": "1234",
    "license_body": "ENARGAS",
    "description": "Instalaciones de gas domiciliario",
    "phone": "+54 (264) 412-3456",
    "locality_id": "capital",
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
        {"category_id": "Otros"},
        {"category_id": "a" * 41},
        {"status": "borrado"},
        {"currency": "EUR"},
        {"condition": "roto"},
        {"locality_id": ""},
        {"locality_id": "capital,rawson"},
        {"operation": "permuta"},
        {"contact_phone": "llamame"},
        {"contact_email": "a@b"},
        {"contact_email": f"{'a' * 250}@b.com"},
    ],
)
def test_rechaza_campos_invalidos(change):
    with pytest.raises(ValidationError):
        ProductIn.model_validate({**VALID, **change})


def test_mensajes_en_espanol():
    with pytest.raises(ValidationError) as error:
        ProductIn.model_validate({**VALID, "title": "ab"})
    assert error.value.errors()[0]["msg"] == "Value error, El título debe tener al menos 3 caracteres."


def test_contacto_normalizado_y_obligatorio_solo_si_esta_activo():
    product = ProductIn.model_validate({**VALID, "contact_email": " ana@example.com "})
    assert product.contact_phone == "542644123456" and product.contact_email == "ana@example.com"
    only_email = ProductIn.model_validate({**VALID, "contact_phone": "", "contact_email": "ana@example.com"})
    assert only_email.contact_phone is None
    with pytest.raises(ValidationError):
        ProductIn.model_validate({**VALID, "contact_phone": ""})
    assert ProductIn.model_validate({**VALID, "contact_phone": "", "status": "pausado"}).contact_phone is None


def test_operacion_obligatoria_solo_en_inmuebles():
    with pytest.raises(ValidationError):
        ProductIn.model_validate({**VALID, "category_id": "inmuebles"})
    assert ProductIn.model_validate({**VALID, "category_id": "inmuebles", "operation": "venta"}).operation == "venta"
    assert ProductIn.model_validate({**VALID, "operation": "alquiler"}).operation is None


def test_descarta_columnas_que_el_cliente_no_puede_escribir():
    data = ProductIn.model_validate(
        {**VALID, "owner_id": "attacker", "business_id": "other", "hidden": False, "expires_at": "2099-01-01"}
    ).model_dump()
    assert not {"owner_id", "business_id", "hidden", "expires_at", "image_path"} & data.keys()


def test_normaliza_telefono_y_valida_oficio():
    service = ServiceIn.model_validate(SERVICE)
    assert service.phone == "542644123456"
    with pytest.raises(ValidationError):
        ServiceIn.model_validate({**SERVICE, "trade_id": "Astronauta"})
    with pytest.raises(ValidationError):
        ServiceIn.model_validate({**SERVICE, "phone": "llamame"})


def test_matricula_y_correo_opcionales_en_el_esquema():
    service = ServiceIn.model_validate({**SERVICE, "license_number": " ", "license_body": "", "contact_email": ""})
    assert service.license_number is None and service.license_body is None and service.contact_email is None
    with pytest.raises(ValidationError):
        ServiceIn.model_validate({**SERVICE, "license_number": "1"})


def test_servicio_no_acepta_columnas_de_administracion():
    data = ServiceIn.model_validate(
        {**SERVICE, "verified": True, "references_verified": True, "hidden": False, "rating_score": 5}
    ).model_dump()
    assert not {"verified", "references_verified", "hidden", "rating_score"} & data.keys()


def test_perfil():
    assert ProfileIn.model_validate({"display_name": " Ana ", "locality_id": "capital"}).display_name == "Ana"
    with pytest.raises(ValidationError):
        ProfileIn.model_validate({"display_name": "A", "locality_id": "capital"})
    with pytest.raises(ValidationError):
        ProfileIn.model_validate({"display_name": "Ana", "locality_id": "San Juan"})


def test_uuid_y_slug():
    assert is_uuid("33333333-3333-4333-8333-333333333333")
    assert not is_uuid("../etc/passwd")
    assert is_slug("9-de-julio") and is_slug("materiales-construccion")
    assert not is_slug("") and not is_slug("Capital") and not is_slug("a--b") and not is_slug("x" * 41)
