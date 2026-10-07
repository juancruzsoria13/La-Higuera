"""Endpoints con una base en memoria. Las políticas RLS reales se prueban en frontend/tests/database.test.ts."""

import uuid
from io import BytesIO

import pytest
from fastapi import Request
from fastapi.testclient import TestClient
from PIL import Image

from app.deps import AuthUser, current_user, get_admin_db, get_db
from app.main import app
from app.supabase import SupabaseError

A = "11111111-1111-4111-8111-111111111111"
B = "22222222-2222-4222-8222-222222222222"
PRODUCT = {
    "title": "Bicicleta urbana",
    "description": "Bicicleta usada en buen estado",
    "price": "1500,25",
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
    "phone": "2644123456",
    "locality": "Capital",
    "status": "activo",
}


def matches(row, filters):
    for column, rule in filters:
        op, _, value = rule.partition(".")
        if op == "eq" and str(row.get(column)).lower() != value.lower():
            return False
        if op == "ilike" and value.strip("*").lower() not in str(row.get(column)).lower():
            return False
    return True


class FakeDb:
    def __init__(self):
        self.tables = {"products": [], "service_providers": [], "profiles": [], "storage_cleanup": []}
        self.files: dict[str, bytes] = {}
        self.calls: list[str] = []
        self.clock = 0

    def stamp(self):
        self.clock += 1
        return f"2026-10-07T12:00:{self.clock:02d}+00:00"

    async def select(self, table, filters=None, *, order=None, offset=None, limit=None, count=False):
        rows = [row for row in self.tables[table] if matches(row, filters or [])]
        start = offset or 0
        return rows[start : start + (limit or len(rows))], len(rows)

    async def insert(self, table, row):
        row = {"id": str(uuid.uuid4()), "verified": False, "image_path": None, **row, "updated_at": self.stamp()}
        self.tables[table].append(row)
        return [row]

    async def update(self, table, filters, values):
        rows = [row for row in self.tables[table] if matches(row, filters)]
        for row in rows:
            row.update(values, updated_at=self.stamp())
        return rows

    async def delete(self, table, filters):
        rows = [row for row in self.tables[table] if matches(row, filters)]
        self.tables[table] = [row for row in self.tables[table] if row not in rows]
        return rows

    async def rpc(self, function, args=None):
        self.calls.append(function)
        if function == "reserve_image":
            return f"{A}/{uuid.uuid4()}.webp"
        if function == "product_seller":
            return "Ana"
        if function == "begin_account_deletion" and getattr(self, "fail_rpc", False):
            raise SupabaseError(400, "locked")
        return None

    async def upload(self, bucket, path, data, content_type):
        self.files[path] = data

    async def download(self, bucket, path):
        return self.files.get(path)

    async def remove(self, bucket, paths):
        for path in paths:
            self.files.pop(path, None)

    async def list_objects(self, bucket, prefix, limit=100):
        return [{"name": key.split("/", 1)[1]} for key in self.files if key.startswith(prefix)][:limit]

    async def admin_delete_user(self, user_id):
        self.calls.append(f"delete_user:{user_id}")


@pytest.fixture
def db():
    return FakeDb()


@pytest.fixture
def api(db):
    def fake_user(request: Request):
        header = request.headers.get("authorization", "")
        return AuthUser(id=header.removeprefix("Bearer "), email="ana@example.com", token="t") if header else None

    app.dependency_overrides = {get_db: lambda: db, get_admin_db: lambda: db, current_user: fake_user}
    with TestClient(app) as client:
        yield client
    app.dependency_overrides = {}


AS_A = {"Authorization": f"Bearer {A}"}
AS_B = {"Authorization": f"Bearer {B}"}


def png() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), "green").save(buffer, "PNG")
    return buffer.getvalue()


def test_health(api):
    assert api.get("/api/health").json()["status"] == "ok"


def test_alta_requiere_sesion_y_valida_en_espanol(api):
    assert api.post("/api/products", data=PRODUCT).status_code == 401
    response = api.post("/api/products", data={**PRODUCT, "title": "ab"}, headers=AS_A)
    assert response.status_code == 422
    assert response.json() == {"detail": "El título debe tener al menos 3 caracteres."}


def test_crud_de_anuncio_con_imagen(api, db):
    created = api.post("/api/products", data=PRODUCT, files={"image": ("foto.png", png(), "image/png")}, headers=AS_A)
    assert created.status_code == 201
    product_id = created.json()["id"]
    product = api.get(f"/api/products/{product_id}").json()
    assert product["price"] == 1500.25 and product["owner_id"] == A and product["seller"] == "Ana"
    assert product["image_path"] in db.files
    assert api.get(f"/api/images/{product['image_path']}").headers["content-type"] == "image/webp"

    stale = api.put(f"/api/products/{product_id}", data={**PRODUCT, "version": "vieja"}, headers=AS_A)
    assert stale.status_code == 409
    other = api.put(f"/api/products/{product_id}", data={**PRODUCT, "version": product["updated_at"]}, headers=AS_B)
    assert other.status_code == 404
    edit = {**PRODUCT, "price": "99", "version": product["updated_at"], "remove_image": "on"}
    assert api.put(f"/api/products/{product_id}", data=edit, headers=AS_A).status_code == 200
    assert api.get(f"/api/products/{product_id}").json()["image_path"] is None

    assert api.delete(f"/api/products/{product_id}", headers=AS_B).status_code == 404
    assert api.delete(f"/api/products/{product_id}", headers=AS_A).json() == {"clean": True}
    assert api.get(f"/api/products/{product_id}").status_code == 404


def test_imagen_invalida_no_guarda_el_anuncio(api, db):
    files = {"image": ("fake.jpg", b"no es una foto", "image/jpeg")}
    response = api.post("/api/products", data=PRODUCT, files=files, headers=AS_A)
    assert response.status_code == 422 and "No pudimos leer" in response.json()["detail"]
    assert db.tables["products"] == []


def test_listado_publico_y_propio(api, db):
    api.post("/api/products", data=PRODUCT, headers=AS_A)
    api.post("/api/products", data={**PRODUCT, "title": "Mesa pausada", "status": "pausado"}, headers=AS_A)
    public = api.get("/api/products").json()
    assert public["count"] == 1 and public["page_size"] == 12
    assert api.get("/api/products", params={"q": "mesa"}).json()["count"] == 0
    assert api.get("/api/products", params={"mine": "true"}).status_code == 401
    assert api.get("/api/products", params={"mine": "true"}, headers=AS_A).json()["count"] == 2


def test_ids_e_imagenes_con_formato_invalido(api):
    assert api.get("/api/products/no-es-uuid").status_code == 404
    assert api.get("/api/images/..%2F..%2Fetc/passwd").status_code == 404
    assert api.get(f"/api/images/{A}/archivo.png").status_code == 404


def test_servicios_no_aceptan_verified_y_usan_version(api, db):
    created = api.post("/api/services", json={**SERVICE, "verified": True}, headers=AS_A)
    assert created.status_code == 201
    service = api.get(f"/api/services/{created.json()['id']}").json()
    assert service["verified"] is False
    stale = api.put(f"/api/services/{service['id']}", json={**SERVICE, "version": "vieja"}, headers=AS_A)
    assert stale.status_code == 409
    fresh = api.put(f"/api/services/{service['id']}", json={**SERVICE, "version": service["updated_at"]}, headers=AS_A)
    assert fresh.status_code == 200
    assert api.get("/api/services", params={"trade": "Gasista"}).json()["count"] == 1
    assert api.delete(f"/api/services/{service['id']}", headers=AS_B).status_code == 404
    bad = api.post("/api/services", json={**SERVICE, "phone": "llamame"}, headers=AS_A)
    assert bad.json()["detail"] == "Ingresá un teléfono válido, con código de área y sin letras."


def test_perfil_y_eliminacion_de_cuenta(api, db):
    db.tables["profiles"].append({"id": A, "display_name": "Ana", "locality": "Capital"})
    assert api.get("/api/profile", headers=AS_A).json() == {
        "display_name": "Ana",
        "locality": "Capital",
        "email": "ana@example.com",
    }
    assert api.put("/api/profile", json={"display_name": "Ana María", "locality": "Rivadavia"}, headers=AS_A).is_success
    db.files[f"{A}/{uuid.uuid4()}.webp"] = b"x"
    assert api.post("/api/account/delete", json={"confirmation": "no"}, headers=AS_A).status_code == 422
    assert api.post("/api/account/delete", json={"confirmation": "ELIMINAR"}, headers=AS_A).is_success
    assert db.files == {} and f"delete_user:{A}" in db.calls
    assert db.calls.index("begin_account_deletion") < db.calls.index(f"delete_user:{A}")


def test_eliminacion_de_cuenta_se_detiene_si_no_puede_bloquear(api, db):
    db.fail_rpc = True
    response = api.post("/api/account/delete", json={"confirmation": "ELIMINAR"}, headers=AS_A)
    assert response.status_code == 502
    assert not any(call.startswith("delete_user") for call in db.calls)
