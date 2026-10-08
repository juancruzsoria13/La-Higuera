import asyncio

import httpx

from app.supabase import Supabase, SupabaseError


def client(handler, key="sb_publishable_x", token=None) -> Supabase:
    return Supabase(httpx.AsyncClient(transport=httpx.MockTransport(handler)), "https://p.supabase.co/", key, token)


def test_clave_publicable_va_solo_en_apikey_y_el_token_como_bearer():
    seen = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen.append(request.headers)
        return httpx.Response(200, json=[], headers={"content-range": "0-0/42"})

    rows, count = asyncio.run(client(handler).select("products", [("status", "eq.activo")], count=True))
    assert count == 42 and rows == []
    assert seen[0]["apikey"] == "sb_publishable_x" and "authorization" not in seen[0]
    asyncio.run(client(handler, token="user-jwt").select("products"))
    assert seen[1]["authorization"] == "Bearer user-jwt"
    asyncio.run(client(handler, key="eyJlegacy").select("products"))
    assert seen[2]["authorization"] == "Bearer eyJlegacy"


def test_filtros_orden_y_paginacion_en_la_url():
    urls = []

    def handler(request: httpx.Request) -> httpx.Response:
        urls.append(request.url)
        return httpx.Response(200, json=[])

    asyncio.run(
        client(handler).select(
            "products", [("updated_at", "eq.2026-10-07T12:00:00+00:00")], order="created_at.desc", offset=12, limit=12
        )
    )
    params = dict(urls[0].params)
    assert urls[0].path == "/rest/v1/products"
    assert params["select"] == "*"
    assert params["updated_at"] == "eq.2026-10-07T12:00:00+00:00"
    assert params["order"] == "created_at.desc" and params["offset"] == "12" and params["limit"] == "12"
    asyncio.run(client(handler).select("products", columns="*,images:product_images(path,sort_order)"))
    assert dict(urls[1].params)["select"] == "*,images:product_images(path,sort_order)"


def test_errores_y_usuario_invalido():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"msg": "bad jwt"})

    assert asyncio.run(client(handler, token="x").get_user()) is None
    try:
        asyncio.run(client(handler).insert("products", {}))
    except SupabaseError as error:
        assert error.status == 401
    else:
        raise AssertionError("debía fallar")
