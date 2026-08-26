"""Dependências injetáveis da API."""

from __future__ import annotations

import secrets

from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader

from app.chat.repository import ClinicalChatRepository
from app.chat.service import ClinicalChatService
from app.core.config import Settings, get_settings
from app.database.client import ReadOnlyPostgres
from app.services.groq_service import GroqVisionService


_internal_api_key = APIKeyHeader(
    name="X-Internal-API-Key",
    scheme_name="BackendJavaApiKey",
    description="Credencial serviço-a-serviço fornecida pelo Backend Java.",
    auto_error=False,
)


def get_vision_service(request: Request) -> GroqVisionService:
    service = getattr(request.app.state, "vision_service", None)
    if not isinstance(service, GroqVisionService):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Serviço de IA indisponível.",
        )
    return service


def get_database(request: Request) -> ReadOnlyPostgres:
    database = getattr(request.app.state, "database", None)
    if not isinstance(database, ReadOnlyPostgres):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Conexao de leitura ao prontuario indisponivel.",
        )
    return database


def get_chat_service(
    database: ReadOnlyPostgres = Depends(get_database),
) -> ClinicalChatService:
    repository = ClinicalChatRepository(database, get_settings())
    return ClinicalChatService(repository)


def require_chat_access(
    request: Request,
    api_key: str | None = Security(_internal_api_key),
) -> None:
    settings = get_settings()
    client_host = request.client.host if request.client else ""
    if settings.app_env.casefold() in {"development", "test"} and client_host in {
        "127.0.0.1",
        "::1",
        "testserver",
    }:
        return
    if api_key is None or not secrets.compare_digest(api_key, settings.internal_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credencial interna invalida.",
            headers={"WWW-Authenticate": "ApiKey"},
        )


def require_internal_api_key(
    api_key: str | None = Security(_internal_api_key),
) -> None:
    settings: Settings = get_settings()
    if api_key is None or not secrets.compare_digest(api_key, settings.internal_api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credencial interna inválida.",
            headers={"WWW-Authenticate": "ApiKey"},
        )
