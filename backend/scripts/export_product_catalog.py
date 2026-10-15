"""Sincroniza el catálogo del frontend desde la fuente del backend.

Ejecutar desde backend: python -m scripts.export_product_catalog
Los cambios de catálogo también requieren una nueva migración SQL.
"""

from pathlib import Path

root = Path(__file__).resolve().parents[2]
source = root / "backend/app/product_catalog.json"
target = root / "frontend/src/modules/products/product_catalog.json"
target.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
