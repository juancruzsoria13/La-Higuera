"""Endpoints con una base en memoria. Las políticas RLS reales se prueban en frontend/tests/database.test.ts."""

import uuid
from datetime import UTC, datetime, timedelta
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
    "category_id": "otros",
    "condition": "usado",
    "locality_id": "capital",
    "contact_phone": "2644123456",
    "status": "activo",
}
SERVICE = {
    "name": "Juan Gas",
    "trade_id": "gasista",
    "license_number": "1234",
    "license_body": "ENARGAS",
    "description": "Instalaciones de gas domiciliario",
    "phone": "2644123456",
    "locality_id": "capital",
    "status": "activo",
}
CATALOG = {
    "categories": [
        {"id": "inmuebles", "name": "Inmuebles", "sort_order": 1, "active": True},
        {"id": "otros", "name": "Otros", "sort_order": 8, "active": True},
        {"id": "viejo", "name": "Rubro inactivo", "sort_order": 9, "active": False},
    ],
    "localities": [
        {"id": "capital", "name": "Capital", "sort_order": 1, "active": True},
        {"id": "rivadavia", "name": "Rivadavia", "sort_order": 3, "active": True},
    ],
    "trades": [
        {"id": "gasista", "name": "Gasista", "requires_license": True, "sort_order": 1, "active": True},
        {"id": "pintor", "name": "Pintor", "requires_license": False, "sort_order": 5, "active": True},
    ],
}


def matches(row, filters):
    for column, rule in filters:
        op, _, value = rule.partition(".")
        if op == "eq" and str(row.get(column)).lower() != value.lower():
            return False
        if op == "gt" and not str(row.get(column)) > value:
            return False
        if op == "ilike" and value.strip("*").lower() not in str(row.get(column)).lower():
            return False
    return True


def in_days(days):
    return (datetime.now(UTC) + timedelta(days=days)).isoformat()


class FakeDb:
    def __init__(self):
        self.tables = {
            "products": [],
            "product_images": [],
            "service_providers": [],
            "service_images": [],
            "profiles": [],
            "storage_cleanup": [],
            **{name: [dict(row) for row in rows] for name, rows in CATALOG.items()},
        }
        self.files: dict[str, bytes] = {}
        self.calls: list[str] = []
        self.clock = 0
        self.fail_images = False

    def stamp(self):
        self.clock += 1
        return f"2026-10-07T12:00:{self.clock:02d}+00:00"

    def named(self, table, item_id):
        return next(({"name": row["name"], **row} for row in self.tables[table] if row["id"] == item_id), None)

    def embed(self, table, row, columns):
        """Imita el embebido de PostgREST que piden los routers."""
        if "product_images" in columns:
            row = {**row, "images": [i for i in self.tables["product_images"] if i["product_id"] == row["id"]]}
        if "service_images" in columns:
            row = {**row, "images": [i for i in self.tables["service_images"] if i["service_provider_id"] == row["id"]]}
        if "categories(" in columns:
            row = {**row, "category": self.named("categories", row["category_id"])}
        if "trades(" in columns:
            row = {**row, "trade": self.named("trades", row["trade_id"])}
        if "localities(" in columns:
            row = {**row, "locality": self.named("localities", row["locality_id"])}
        return row

    async def select(self, table, filters=None, *, columns="*", order=None, offset=None, limit=None, count=False):
        rows = [self.embed(table, row, columns) for row in self.tables[table] if matches(row, filters or [])]
        start = offset or 0
        return rows[start : start + (limit or len(rows))], len(rows)

    async def insert(self, table, row):
        defaults = {"id": str(uuid.uuid4()), "hidden": False, "expires_at": in_days(60)}
        if table == "service_providers":
            defaults.update(verified=False, references_verified=False)
        row = {**defaults, **row, "updated_at": self.stamp()}
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
        images, key = {
            "products": ("product_images", "product_id"),
            "service_providers": ("service_images", "service_provider_id"),
        }.get(table, (None, None))
        if images:
            ids = {row["id"] for row in rows}
            gone = [i for i in self.tables[images] if i[key] in ids]
            self.tables[images] = [i for i in self.tables[images] if i not in gone]
            cleanup = [{"path": i["path"], "owner_id": i["owner_id"], "ready": True} for i in gone]
            self.tables["storage_cleanup"].extend(cleanup)
        return rows

    async def rpc(self, function, args=None):
        self.calls.append(function)
        if function == "reserve_image":
            return f"{A}/{uuid.uuid4()}.webp"
        if function == "product_seller":
            return "Ana"
        if function == "set_product_images":
            if self.fail_images:
                raise SupabaseError(400, "Image does not exist")
            product = args["product_id"]
            owner = next(row["owner_id"] for row in self.tables["products"] if row["id"] == product)
            for image in self.tables["product_images"]:
                if image["product_id"] == product and image["path"] not in args["paths"]:
                    self.tables["storage_cleanup"].append({"path": image["path"], "owner_id": owner, "ready": True})
            others = [i for i in self.tables["product_images"] if i["product_id"] != product]
            mine = [
                {"product_id": product, "owner_id": owner, "path": path, "sort_order": order}
                for order, path in enumerate(args["paths"])
            ]
            self.tables["product_images"] = others + mine
            return None
        if function == "set_service_images":
            if self.fail_images:
                raise SupabaseError(400, "Image does not exist")
            service = args["service_provider_id"]
            owner = next(row["owner_id"] for row in self.tables["service_providers"] if row["id"] == service)
            wanted = [("perfil", args["avatar"], 0)] if args["avatar"] else []
            wanted += [("trabajo", path, order) for order, path in enumerate(args["works"])]
            for image in self.tables["service_images"]:
                if image["service_provider_id"] == service and image["path"] not in {path for _, path, _ in wanted}:
                    self.tables["storage_cleanup"].append({"path": image["path"], "owner_id": owner, "ready": True})
            others = [i for i in self.tables["service_images"] if i["service_provider_id"] != service]
            mine = [
                {"service_provider_id": service, "owner_id": owner, "kind": kind, "path": path, "sort_order": order}
                for kind, path, order in wanted
            ]
            self.tables["service_images"] = others + mine
            return None
        if function == "abandon_image":
            self.tables["storage_cleanup"].append({"path": args["image"], "owner_id": A, "ready": True})
            return None
        if function == "renew_product":
            for row in self.tables["products"]:
                if row["id"] == args["product_id"]:
                    row["expires_at"] = in_days(60)
                    return row["expires_at"]
            raise SupabaseError(400, "Product not found")
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


def png(color="green") -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (8, 8), color).save(buffer, "PNG")
    return buffer.getvalue()


def photos(*colors):
    return [("images", (f"{color}.png", png(color), "image/png")) for color in colors]


def test_health(api):
    assert api.get("/api/health").json()["status"] == "ok"


def test_catalogo_solo_trae_items_activos(api):
    catalog = api.get("/api/catalog").json()
    assert [c["id"] for c in catalog["categories"]] == ["inmuebles", "otros"]
    assert {"id": "gasista", "name": "Gasista", "requires_license": True}.items() <= catalog["trades"][0].items()
    assert len(catalog["localities"]) == 2


def test_alta_requiere_sesion_y_valida_en_espanol(api):
    assert api.post("/api/products", data=PRODUCT).status_code == 401
    response = api.post("/api/products", data={**PRODUCT, "title": "ab"}, headers=AS_A)
    assert response.status_code == 422
    assert response.json() == {"detail": "El título debe tener al menos 3 caracteres."}


@pytest.mark.parametrize(
    ("change", "message"),
    [
        ({"category_id": "viejo"}, "Elegí un rubro de la lista."),
        ({"category_id": "Otros"}, "Elegí un rubro de la lista."),
        ({"locality_id": "mendoza"}, "Elegí una localidad de la lista."),
        ({"category_id": "inmuebles"}, "Indicá si el inmueble es para venta o alquiler."),
        ({"contact_phone": ""}, "Dejá un teléfono o un correo de contacto para publicar el anuncio."),
        ({"contact_email": "sin-arroba"}, "Ingresá un correo válido."),
    ],
)
def test_alta_valida_catalogo_operacion_y_contacto(api, db, change, message):
    response = api.post("/api/products", data={**PRODUCT, **change}, headers=AS_A)
    assert response.status_code == 422 and response.json() == {"detail": message}
    assert db.tables["products"] == []


def test_operacion_solo_para_inmuebles_y_pausado_sin_contacto(api, db):
    house = {**PRODUCT, "category_id": "inmuebles", "operation": "alquiler"}
    assert api.post("/api/products", data=house, headers=AS_A).status_code == 201
    other = {**PRODUCT, "operation": "venta"}
    assert api.post("/api/products", data=other, headers=AS_A).status_code == 201
    paused = {**PRODUCT, "contact_phone": "", "status": "pausado"}
    assert api.post("/api/products", data=paused, headers=AS_A).status_code == 201
    assert [row["operation"] for row in db.tables["products"]] == ["alquiler", None, None]


def test_crud_de_anuncio_con_varias_fotos(api, db):
    created = api.post("/api/products", data=PRODUCT, files=photos("red", "green", "blue"), headers=AS_A)
    assert created.status_code == 201
    product_id = created.json()["id"]
    product = api.get(f"/api/products/{product_id}").json()
    assert product["price"] == 1500.25 and product["owner_id"] == A and product["seller"] == "Ana"
    assert product["category_name"] == "Otros" and product["locality_name"] == "Capital"
    assert len(product["images"]) == 3 and all(path in db.files for path in product["images"])
    assert api.get(f"/api/images/{product['images'][0]}").headers["content-type"] == "image/webp"

    stale = api.put(f"/api/products/{product_id}", data={**PRODUCT, "version": "vieja"}, headers=AS_A)
    assert stale.status_code == 409
    other = api.put(f"/api/products/{product_id}", data={**PRODUCT, "version": product["updated_at"]}, headers=AS_B)
    assert other.status_code == 404

    # Nueva portada (archivo nuevo), la tercera foto pasa a segunda y se quitan las otras dos.
    first, _, third = product["images"]
    order = [("image_order", "new:0"), ("image_order", third)]
    edit = api.put(
        f"/api/products/{product_id}",
        data={**PRODUCT, "price": "99", "version": product["updated_at"], "image_order": [t for _, t in order]},
        files=photos("white"),
        headers=AS_A,
    )
    assert edit.status_code == 200
    edited = api.get(f"/api/products/{product_id}").json()
    assert edited["price"] == 99 and len(edited["images"]) == 2
    assert edited["images"][1] == third and edited["images"][0] not in product["images"]
    assert first not in db.files and third in db.files

    assert api.delete(f"/api/products/{product_id}", headers=AS_B).status_code == 404
    assert api.delete(f"/api/products/{product_id}", headers=AS_A).json() == {"clean": True}
    assert api.get(f"/api/products/{product_id}").status_code == 404
    assert db.files == {}


def test_editar_sin_cambiar_fotos_no_llama_a_set_product_images(api, db):
    product_id = api.post("/api/products", data=PRODUCT, files=photos("red"), headers=AS_A).json()["id"]
    product = api.get(f"/api/products/{product_id}").json()
    db.calls.clear()
    data = {**PRODUCT, "version": product["updated_at"], "image_order": product["images"]}
    assert api.put(f"/api/products/{product_id}", data=data, headers=AS_A).status_code == 200
    assert "set_product_images" not in db.calls


@pytest.mark.parametrize(
    "order",
    [["new:1"], ["new:0", "new:0"], [f"{B}/{uuid.uuid4()}.webp"], ["../otro"], [f"new:{i}" for i in range(9)]],
)
def test_orden_de_fotos_invalido(api, db, order):
    response = api.post("/api/products", data={**PRODUCT, "image_order": order}, files=photos("red"), headers=AS_A)
    assert response.status_code == 422
    assert db.tables["products"] == [] and db.files == {}


def test_imagen_invalida_no_guarda_el_anuncio(api, db):
    files = {"images": ("fake.jpg", b"no es una foto", "image/jpeg")}
    response = api.post("/api/products", data=PRODUCT, files=files, headers=AS_A)
    assert response.status_code == 422 and "No pudimos leer" in response.json()["detail"]
    assert db.tables["products"] == []


def test_falla_parcial_de_fotos_deshace_el_alta_y_limpia(api, db):
    db.fail_images = True
    response = api.post("/api/products", data=PRODUCT, files=photos("red", "blue"), headers=AS_A)
    assert response.status_code == 409
    assert db.tables["products"] == [] and db.files == {}
    assert db.calls.count("abandon_image") == 2


def test_falla_de_fotos_al_editar_avisa_que_los_datos_si_se_guardaron(api, db):
    product_id = api.post("/api/products", data=PRODUCT, headers=AS_A).json()["id"]
    product = api.get(f"/api/products/{product_id}").json()
    db.fail_images = True
    data = {**PRODUCT, "title": "Bicicleta nueva", "version": product["updated_at"]}
    response = api.put(f"/api/products/{product_id}", data=data, files=photos("red"), headers=AS_A)
    assert response.status_code == 409 and "pero no las fotos" in response.json()["detail"]
    assert db.files == {}


def test_listado_publico_filtra_visibilidad(api, db):
    api.post("/api/products", data=PRODUCT, headers=AS_A)
    api.post("/api/products", data={**PRODUCT, "title": "Mesa pausada", "status": "pausado"}, headers=AS_A)
    api.post("/api/products", data={**PRODUCT, "title": "Silla oculta"}, headers=AS_A)
    api.post("/api/products", data={**PRODUCT, "title": "Lámpara vencida"}, headers=AS_A)
    db.tables["products"][2]["hidden"] = True
    db.tables["products"][3]["expires_at"] = in_days(-1)
    public = api.get("/api/products").json()
    assert public["count"] == 1 and public["page_size"] == 12
    assert public["items"][0]["title"] == "Bicicleta urbana"
    assert api.get("/api/products", headers=AS_A).json()["count"] == 1
    assert api.get("/api/products", params={"q": "mesa"}).json()["count"] == 0
    assert api.get("/api/products", params={"category": "otros"}).json()["count"] == 1
    assert api.get("/api/products", params={"category": "inmuebles"}).json()["count"] == 0
    assert api.get("/api/products", params={"mine": "true"}).status_code == 401
    assert api.get("/api/products", params={"mine": "true"}, headers=AS_A).json()["count"] == 4


def test_renovar_anuncio_vencido(api, db):
    product_id = api.post("/api/products", data=PRODUCT, headers=AS_A).json()["id"]
    db.tables["products"][0]["expires_at"] = in_days(-1)
    assert api.get("/api/products").json()["count"] == 0
    assert api.post(f"/api/products/{product_id}/renew").status_code == 401
    renewed = api.post(f"/api/products/{product_id}/renew", headers=AS_A)
    assert renewed.status_code == 200 and renewed.json()["expires_at"] > in_days(59)
    assert api.get("/api/products").json()["count"] == 1
    assert api.post(f"/api/products/{uuid.uuid4()}/renew", headers=AS_A).status_code == 409


def test_ids_e_imagenes_con_formato_invalido(api):
    assert api.get("/api/products/no-es-uuid").status_code == 404
    assert api.post("/api/products/no-es-uuid/renew", headers=AS_A).status_code == 404
    assert api.get("/api/images/..%2F..%2Fetc/passwd").status_code == 404
    assert api.get(f"/api/images/{A}/archivo.png").status_code == 404


def test_servicios_no_aceptan_verified_y_usan_version(api, db):
    created = api.post("/api/services", data={**SERVICE, "verified": True, "rating_score": 5}, headers=AS_A)
    assert created.status_code == 201
    service = api.get(f"/api/services/{created.json()['id']}").json()
    assert service["verified"] is False and service["trade_name"] == "Gasista" and service["requires_license"]
    assert "rating_score" not in db.tables["service_providers"][0]
    stale = api.put(f"/api/services/{service['id']}", data={**SERVICE, "version": "vieja"}, headers=AS_A)
    assert stale.status_code == 409
    fresh = api.put(f"/api/services/{service['id']}", data={**SERVICE, "version": service["updated_at"]}, headers=AS_A)
    assert fresh.status_code == 200
    assert api.get("/api/services", params={"trade": "gasista"}).json()["count"] == 1
    assert api.get("/api/services", params={"trade": "pintor"}).json()["count"] == 0
    assert api.delete(f"/api/services/{service['id']}", headers=AS_B).status_code == 404
    bad = api.post("/api/services", data={**SERVICE, "phone": "llamame"}, headers=AS_A)
    assert bad.json()["detail"] == "Ingresá un teléfono válido, con código de área y sin letras."


def test_matricula_solo_si_el_oficio_la_exige(api, db):
    missing = api.post("/api/services", data={**SERVICE, "license_number": "", "license_body": ""}, headers=AS_A)
    assert missing.status_code == 422
    assert missing.json()["detail"] == "Este oficio exige matrícula: ingresá el número y la entidad que la emitió."
    painter = {**SERVICE, "trade_id": "pintor", "contact_email": "pintor@example.com"}
    assert api.post("/api/services", data=painter, headers=AS_A).status_code == 201
    row = db.tables["service_providers"][0]
    assert row["license_number"] is None and row["license_body"] is None
    assert row["contact_email"] == "pintor@example.com"
    unknown = api.post("/api/services", data={**SERVICE, "trade_id": "astronauta"}, headers=AS_A)
    assert unknown.json()["detail"] == "Elegí un oficio de la lista."


def test_servicio_con_foto_de_perfil_y_trabajos(api, db):
    files = [("avatar_file", ("yo.png", png("white"), "image/png")), *photos("red", "blue")]
    created = api.post("/api/services", data={**SERVICE, "avatar": "new"}, files=files, headers=AS_A)
    assert created.status_code == 201
    service = api.get(f"/api/services/{created.json()['id']}").json()
    assert service["avatar"] in db.files and len(service["work_images"]) == 2
    assert all(path in db.files for path in service["work_images"])
    assert "images" not in service

    # Quita la foto de perfil, invierte el orden de los trabajos y agrega uno nuevo al final.
    first, second = service["work_images"]
    data = {**SERVICE, "version": service["updated_at"], "avatar": "", "image_order": [second, first, "new:0"]}
    edit = api.put(f"/api/services/{service['id']}", data=data, files=photos("green"), headers=AS_A)
    assert edit.status_code == 200
    edited = api.get(f"/api/services/{service['id']}").json()
    assert edited["avatar"] is None and edited["work_images"][:2] == [second, first] and len(edited["work_images"]) == 3
    assert service["avatar"] not in db.files

    db.calls.clear()
    keep = {**SERVICE, "version": edited["updated_at"], "avatar": "", "image_order": edited["work_images"]}
    assert api.put(f"/api/services/{service['id']}", data=keep, headers=AS_A).status_code == 200
    assert "set_service_images" not in db.calls
    assert api.delete(f"/api/services/{service['id']}", headers=AS_A).json() == {"deleted": True, "clean": True}
    assert db.files == {}


@pytest.mark.parametrize(
    "change",
    [{"avatar": "new"}, {"avatar": f"{A}/{uuid.uuid4()}.webp"}, {"image_order": [f"new:{i}" for i in range(9)]}],
)
def test_fotos_de_servicio_invalidas(api, db, change):
    response = api.post("/api/services", data={**SERVICE, **change}, files=photos("red"), headers=AS_A)
    assert response.status_code == 422
    assert db.tables["service_providers"] == [] and db.files == {}


def test_falla_de_fotos_deshace_el_alta_del_servicio(api, db):
    db.fail_images = True
    files = [("avatar_file", ("yo.png", png(), "image/png")), *photos("red")]
    response = api.post("/api/services", data={**SERVICE, "avatar": "new"}, files=files, headers=AS_A)
    assert response.status_code == 409
    assert db.tables["service_providers"] == [] and db.files == {}
    assert db.calls.count("abandon_image") == 2


def test_listado_de_servicios_oculta_los_ocultos(api, db):
    api.post("/api/services", data=SERVICE, headers=AS_A)
    db.tables["service_providers"][0]["hidden"] = True
    assert api.get("/api/services").json()["count"] == 0
    assert api.get("/api/services", params={"mine": "true"}, headers=AS_A).json()["count"] == 1


def test_perfil_y_eliminacion_de_cuenta(api, db):
    db.tables["profiles"].append({"id": A, "display_name": "Ana", "locality_id": "capital"})
    assert api.get("/api/profile", headers=AS_A).json() == {
        "display_name": "Ana",
        "locality_id": "capital",
        "email": "ana@example.com",
    }
    bad = api.put("/api/profile", json={"display_name": "Ana", "locality_id": "mendoza"}, headers=AS_A)
    assert bad.status_code == 422
    saved = api.put("/api/profile", json={"display_name": "Ana María", "locality_id": "rivadavia"}, headers=AS_A)
    assert saved.json() == {"display_name": "Ana María", "locality_id": "rivadavia"}
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
