"""Entrypoint FastAPI do Primordial Inteligência 360."""

from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router as vision_router
from app.chat.routes import router as chat_router
from app.chat.repository import ClinicalChatRepository
from app.chat.service import ClinicalChatService
from app.core.config import Settings, get_settings
from app.database.client import ReadOnlyPostgres
from app.services.groq_service import GroqVisionService
from app.web.routes import router as web_router
from app.voice.providers import VoicePipelineService
from app.voice.routes import router as voice_router


_REQUEST_ID_SEGURO = re.compile(r"^[A-Za-z0-9._-]{1,64}$")
_APP_DIR = Path(__file__).resolve().parent


def _configure_logging(settings: Settings) -> None:
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.vision_service = GroqVisionService(settings)
    app.state.database = None
    app.state.voice_service = None
    try:
        if settings.database_enabled:
            database = ReadOnlyPostgres(settings)
            await database.connect()
            app.state.database = database
            if settings.voice_enabled:
                chat_service = ClinicalChatService(
                    ClinicalChatRepository(database, settings)
                )
                app.state.voice_service = await VoicePipelineService.create(
                    settings, chat_service
                )
        yield
    finally:
        if isinstance(app.state.voice_service, VoicePipelineService):
            await app.state.voice_service.close()
        if isinstance(app.state.database, ReadOnlyPostgres):
            await app.state.database.close()
        await app.state.vision_service.close()


def create_app() -> FastAPI:
    settings = get_settings()
    _configure_logging(settings)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Microserviço interno para processamento exclusivo de dados clínicos "
            "pseudonimizados."
        ),
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
        lifespan=lifespan,
    )

    if settings.cors_allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_allowed_origins),
            allow_credentials=False,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=[
                "Content-Type",
                "X-Clinic-ID",
                "X-Internal-API-Key",
                "X-Request-ID",
            ],
            expose_headers=[
                "Server-Timing",
                "X-Request-ID",
                "X-Groq-Model",
                "X-Groq-Prompt-Tokens",
                "X-Groq-Completion-Tokens",
                "X-Groq-Total-Tokens",
            ],
            max_age=600,
        )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        recebido = request.headers.get("X-Request-ID", "")
        request_id = recebido if _REQUEST_ID_SEGURO.fullmatch(recebido) else str(uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        erros = [
            {
                "loc": list(erro.get("loc", ())),
                "msg": str(erro.get("msg", "Entrada inválida.")),
                "type": str(erro.get("type", "validation_error")),
            }
            for erro in exc.errors()
        ]
        logging.getLogger(__name__).warning(
            "request_validation_failed request_id=%s errors=%d",
            getattr(request.state, "request_id", "unknown"),
            len(erros),
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"detail": erros},
        )

    @app.get("/health", tags=["Operação"], include_in_schema=False)
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": "inteligencia-360",
            "version": settings.app_version,
        }

    @app.get("/ready", tags=["Operacao"], include_in_schema=False)
    async def ready(request: Request) -> JSONResponse:
        if not settings.database_enabled:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={"status": "ready", "database": "disabled"},
            )
        database = getattr(request.app.state, "database", None)
        if not isinstance(database, ReadOnlyPostgres) or not await database.ping():
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={"status": "not_ready", "database": "unavailable"},
            )
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={"status": "ready", "database": "read_only"},
        )

    app.mount(
        "/static/primordial-data",
        StaticFiles(directory=str(_APP_DIR / "static")),
        name="primordial-data-static",
    )
    app.include_router(web_router)
    app.include_router(chat_router)
    app.include_router(voice_router)
    app.include_router(vision_router)
    return app


app = create_app()
