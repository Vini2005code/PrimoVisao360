"""Endpoints do Motor de Inteligência 360."""

from __future__ import annotations

import logging
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.dependencies import get_vision_service, require_internal_api_key
from app.schemas import Visao360Entrada, Visao360Saida
from app.services.groq_service import (
    AIServiceInvalidResponse,
    AIServiceTimeout,
    AIServiceUnavailable,
    GroqVisionService,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai",
    tags=["Visão 360"],
    dependencies=[Depends(require_internal_api_key)],
)


@router.post(
    "/gerar-visao-360",
    response_model=Visao360Saida,
    status_code=status.HTTP_200_OK,
    summary="Gerar insights clínicos pseudonimizados",
    description=(
        "Recebe somente contexto clínico pseudonimizado, consulta o provedor de IA "
        "e devolve uma resposta validada pelo contrato Visão 360."
    ),
)
async def gerar_visao_360(
    payload: Visao360Entrada,
    response: Response,
    service: GroqVisionService = Depends(get_vision_service),
) -> Visao360Saida:
    inicio = perf_counter()
    try:
        geracao = await service.generate(payload)
    except AIServiceTimeout as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="O provedor de IA excedeu o tempo limite.",
        ) from exc
    except AIServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="O provedor de IA está temporariamente indisponível.",
        ) from exc
    except AIServiceInvalidResponse as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="O provedor de IA devolveu uma resposta inválida.",
        ) from exc

    total_ms = round((perf_counter() - inicio) * 1000)
    response.headers["Server-Timing"] = (
        f"groq;dur={geracao.provider_latency_ms}, total;dur={total_ms}"
    )
    response.headers["X-Groq-Model"] = geracao.model
    response.headers["X-Groq-Prompt-Tokens"] = str(geracao.usage.prompt_tokens)
    response.headers["X-Groq-Completion-Tokens"] = str(
        geracao.usage.completion_tokens
    )
    response.headers["X-Groq-Total-Tokens"] = str(geracao.usage.total_tokens)

    logger.info(
        "vision_360_generated clinic_id=%s total_ms=%d groq_ms=%d total_tokens=%d",
        payload.clinic_id,
        total_ms,
        geracao.provider_latency_ms,
        geracao.usage.total_tokens,
    )
    return geracao.insights
