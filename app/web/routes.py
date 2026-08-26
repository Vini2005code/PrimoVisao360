"""Rota HTML incorporavel, sem acesso a PII ou ao contexto clinico."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, Response
from fastapi.templating import Jinja2Templates

_APP_DIR = Path(__file__).resolve().parents[1]
templates = Jinja2Templates(directory=str(_APP_DIR / "templates"))

router = APIRouter(tags=["Interface"], include_in_schema=False)


def _render_primordial_data(
    request: Request,
    *,
    embedded: bool,
) -> HTMLResponse:
    response = templates.TemplateResponse(
        request=request,
        name="primordial_data.html",
        context={
            "embedded": embedded,
        },
    )
    response.headers.update(
        {
            "Cache-Control": "no-store",
            "Content-Security-Policy": (
                "default-src 'self'; base-uri 'none'; object-src 'none'; "
                "frame-ancestors 'self'; form-action 'self'; "
                "script-src 'self'; style-src 'self'; img-src 'self' data:; "
                "font-src 'self'; connect-src 'self'"
            ),
            "Permissions-Policy": (
                "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
            ),
            "Referrer-Policy": "no-referrer",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "SAMEORIGIN",
        }
    )
    return response


@router.get("/", response_class=HTMLResponse, name="home")
async def home_page(request: Request) -> HTMLResponse:
    return _render_primordial_data(request, embedded=False)


@router.get("/primordial-data", response_class=HTMLResponse, name="primordial-data")
async def primordial_data_page(
    request: Request,
    embedded: bool = False,
) -> HTMLResponse:
    return _render_primordial_data(request, embedded=embedded)


@router.get("/favicon.ico", include_in_schema=False)
async def favicon() -> Response:
    return Response(status_code=204)

