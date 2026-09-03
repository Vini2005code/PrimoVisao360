"""Endpoints do Motor de Inteligência 360."""

from __future__ import annotations

import logging
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.dependencies import get_vision_service, require_internal_api_key
from app.schemas import (
    ChatDinamicoEntrada,
    ChatDinamicoSaida,
    PlanejamentoPopulacionalEntrada,
    PlanoConsultaPopulacional,
    RespostaPopulacionalEntrada,
    RespostaPopulacionalSaida,
    Visao360Entrada,
    Visao360Saida,
)
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


@router.post(
    "/chat-dinamico",
    response_model=ChatDinamicoSaida,
    status_code=status.HTTP_200_OK,
    summary="Responder ao chat sobre contexto clínico pseudonimizado",
    description=(
        "Recebe do gateway Java uma pergunta e um contexto clínico já "
        "pseudonimizados. Não consulta banco de dados nem aceita PII."
    ),
)
async def chat_dinamico(
    payload: ChatDinamicoEntrada,
    response: Response,
    service: GroqVisionService = Depends(get_vision_service),
) -> ChatDinamicoSaida:
    inicio = perf_counter()
    try:
        geracao = await service.generate_chat(payload)
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
        "dynamic_chat_generated clinic_id=%s total_ms=%d groq_ms=%d total_tokens=%d",
        payload.clinic_id,
        total_ms,
        geracao.provider_latency_ms,
        geracao.usage.total_tokens,
    )
    return geracao.resposta


@router.post(
    "/populacional/planejar",
    response_model=PlanoConsultaPopulacional,
    status_code=status.HTTP_200_OK,
    summary="Planejar consulta populacional segura",
    description=(
        "Seleciona exatamente uma ferramenta local permitida. O FastAPI não "
        "consulta o banco e não produz SQL."
    ),
)
async def planejar_consulta_populacional(
    payload: PlanejamentoPopulacionalEntrada,
    response: Response,
    service: GroqVisionService = Depends(get_vision_service),
) -> PlanoConsultaPopulacional:
    inicio = perf_counter()
    try:
        geracao = await service.plan_population(payload)
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
            detail="O provedor de IA devolveu um plano inválido.",
        ) from exc

    total_ms = round((perf_counter() - inicio) * 1000)
    _adicionar_metricas(response, geracao, total_ms)
    logger.info(
        "population_plan_generated clinic_id=%s tool=%s total_ms=%d groq_ms=%d",
        payload.clinic_id,
        geracao.plano.ferramenta,
        total_ms,
        geracao.provider_latency_ms,
    )
    return geracao.plano


@router.post(
    "/populacional/responder",
    response_model=RespostaPopulacionalSaida,
    status_code=status.HTTP_200_OK,
    summary="Redigir resposta a partir de agregado autorizado",
    description=(
        "Recebe somente o resultado agregado calculado pelo Java sob RLS e "
        "devolve texto validado por Structured Outputs."
    ),
)
async def responder_consulta_populacional(
    payload: RespostaPopulacionalEntrada,
    response: Response,
    service: GroqVisionService = Depends(get_vision_service),
) -> RespostaPopulacionalSaida:
    inicio = perf_counter()
    try:
        geracao = await service.answer_population(payload)
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
    _adicionar_metricas(response, geracao, total_ms)
    logger.info(
        "population_answer_generated clinic_id=%s tool=%s total_ms=%d groq_ms=%d",
        payload.clinic_id,
        payload.resultado_agregado.ferramenta,
        total_ms,
        geracao.provider_latency_ms,
    )
    return geracao.resposta


def _adicionar_metricas(response: Response, geracao: object, total_ms: int) -> None:
    provider_latency_ms = int(getattr(geracao, "provider_latency_ms"))
    usage = getattr(geracao, "usage")
    response.headers["Server-Timing"] = (
        f"groq;dur={provider_latency_ms}, total;dur={total_ms}"
    )
    response.headers["X-Groq-Model"] = str(getattr(geracao, "model"))
    response.headers["X-Groq-Prompt-Tokens"] = str(usage.prompt_tokens)
    response.headers["X-Groq-Completion-Tokens"] = str(usage.completion_tokens)
    response.headers["X-Groq-Total-Tokens"] = str(usage.total_tokens)
