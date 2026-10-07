from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import get_settings
from .routers import account, images, products, services


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    async with httpx.AsyncClient(timeout=httpx.Timeout(15.0)) as http:
        app.state.http = http
        yield


app = FastAPI(title="La Higuera API", version="0.2.0", lifespan=lifespan)

origins = [origin.strip() for origin in get_settings().cors_origins.split(",") if origin.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["Authorization", "Content-Type"]
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, error: RequestValidationError) -> JSONResponse:
    """Devuelve solo el primer mensaje, igual que los formularios del frontend."""
    first = error.errors()[0] if error.errors() else {}
    message = str(first.get("msg", "Revisá los datos ingresados.")).removeprefix("Value error, ")
    return JSONResponse({"detail": message}, status_code=422)


@app.get("/api/health", tags=["estado"])
async def health() -> dict[str, object]:
    settings = get_settings()
    return {"status": "ok", "supabase": settings.configured}


for router in (products.router, services.router, account.router, images.router):
    app.include_router(router, prefix="/api")
