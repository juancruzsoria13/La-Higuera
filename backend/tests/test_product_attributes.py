import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.product_attributes import CATALOG, validate_attributes
from app.schemas import ProductIn
from tests.test_schemas import VALID


def test_frontend_catalog_matches_backend():
    path = Path(__file__).resolve().parents[2] / "frontend/src/modules/products/product_catalog.json"
    assert json.loads(path.read_text(encoding="utf-8")) == CATALOG
    assert len(CATALOG["subcategories"]) == 14


@pytest.mark.parametrize("item", CATALOG["subcategories"], ids=lambda item: item["id"])
def test_all_subcategories_accept_their_fields(item):
    values = {}
    for key in item["attributes"]:
        field = CATALOG["attributes"][key]
        values[key] = (
            field["options"][0]["id"]
            if field["type"] == "select"
            else str(field["min"])
            if field["type"] == "number"
            else "https://maps.app.goo.gl/abc"
            if field["type"] == "url"
            else "Ejemplo"
        )
    product = ProductIn.model_validate(
        {
            **VALID,
            "category_id": item["category_id"],
            "subcategory_id": item["id"],
            "operation": "venta",
            "attributes": json.dumps(values),
        }
    )
    assert product.attributes == values


@pytest.mark.parametrize(
    "category,subcategory,values",
    [
        ("vehiculos", "casas", {}),
        ("inmuebles", "inexistente", {}),
        ("otros", None, {"brand": "Marca"}),
        ("inmuebles", "terrenos-lotes", {"bedrooms": "2"}),
        ("vehiculos", "bicicletas", {"mileage": "10"}),
        ("vehiculos", "autos", {"year": "1800"}),
        ("vehiculos", "autos", {"year": "2026.5"}),
        ("vehiculos", "autos", {"transmission": "otra"}),
        ("inmuebles", "casas", {"surface": "0"}),
        ("inmuebles", "casas", {"bedrooms": "-1"}),
        ("inmuebles", "casas", {"bedrooms": True}),
        ("inmuebles", "casas", {"maps_url": "javascript:alert(1)"}),
        ("inmuebles", "casas", {"maps_url": "https://google.com.evil.test/maps"}),
        ("inmuebles", "casas", {"maps_url": "https://evil.test@google.com/maps"}),
        ("inmuebles", "casas", []),
        ("inmuebles", "casas", "broken-json"),
    ],
)
def test_rejects_wrong_subcategories_and_attributes(category, subcategory, values):
    with pytest.raises(ValidationError):
        ProductIn.model_validate(
            {
                **VALID,
                "category_id": category,
                "subcategory_id": subcategory,
                "operation": "venta",
                "attributes": values,
            }
        )


def test_preserves_zero_and_no_and_normalizes_decimal():
    assert validate_attributes(
        "inmuebles",
        "casas",
        {
            "age": "0",
            "credit_eligible": "no",
            "surface": " 125,50 ",
            "neighborhood": "  ",
        },
    ) == {"age": "0", "credit_eligible": "no", "surface": "125.50"}


def test_legacy_products_remain_valid():
    product = ProductIn.model_validate(VALID)
    assert product.subcategory_id is None and product.attributes == {}
