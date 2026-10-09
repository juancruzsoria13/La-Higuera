"""Limpieza de Storage: borra imágenes reemplazadas, eliminadas o reservadas y nunca usadas (más de 24 h).

Uso: python -m scripts.cleanup   (desde backend/, con backend/.env configurado)
"""

import asyncio
import sys
from datetime import UTC, datetime, timedelta

import httpx

from app.config import BUCKET, get_settings
from app.supabase import Supabase, SupabaseError


async def main() -> int:
    settings = get_settings()
    if not settings.admin_configured:
        print("Configurá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en backend/.env.", file=sys.stderr)
        return 1
    async with httpx.AsyncClient(timeout=30) as http:
        admin = Supabase(http, settings.supabase_url, settings.supabase_service_role_key)
        deadline = (datetime.now(UTC) - timedelta(hours=24)).isoformat()
        # Reclama de forma atómica las reservas vencidas. Vincular una imagen a un anuncio bloquea
        # la misma fila, así que una subida pendiente no puede usarse mientras se reclama.
        await admin.update(
            "storage_cleanup", [("ready", "eq.false"), ("created_at", f"lt.{deadline}")], {"ready": True}
        )
        total = 0
        while True:
            rows, _ = await admin.select("storage_cleanup", [("ready", "eq.true")], limit=100)
            if not rows:
                break
            progress = 0
            for row in rows:
                path = row["path"]
                linked = [
                    row
                    for table in ("product_images", "service_images")
                    for row in (await admin.select(table, [("path", f"eq.{path}")], limit=1))[0]
                ]
                if linked:
                    print("Archivo todavía asociado; se conserva:", path, file=sys.stderr)
                    continue
                try:
                    await admin.remove(BUCKET, [path])
                except SupabaseError as error:
                    print("No se pudo limpiar", path, error, file=sys.stderr)
                    continue
                await admin.delete("storage_cleanup", [("path", f"eq.{path}")])
                progress += 1
                total += 1
            if not progress:
                print("Quedan archivos pendientes; corregí el problema y reintentá.", file=sys.stderr)
                return 1
    print(f"Limpieza completada: {total} archivos.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
