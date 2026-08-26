"""Endpoint do chat que consulta exclusivamente o PostgreSQL real."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.chat.schemas import ChatRequest, ChatResponse
from app.chat.service import ClinicalChatService
from app.database.client import DatabaseSecurityError, DatabaseUnavailable
from app.dependencies import get_chat_service, require_chat_access


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat clinico"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(require_chat_access)],
    summary="Consultar o prontuario com uma pergunta cadastrada",
    description=(
        "Classifica a pergunta sem LLM e executa somente uma consulta SELECT "
        "previamente cadastrada no schema clinico."
    ),
)
async def chat(
    payload: ChatRequest,
    service: ClinicalChatService = Depends(get_chat_service),
) -> ChatResponse:
    try:
        answer = await service.answer(payload.pergunta)
    except DatabaseSecurityError:
        logger.critical("chat_query_blocked reason=read_only_policy")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A consulta cadastrada violou a politica de leitura.",
        ) from None
    except DatabaseUnavailable:
        logger.error("chat_query_failed reason=database_unavailable")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nao foi possivel consultar o prontuario neste momento.",
        ) from None

    logger.info("chat_query_completed type=%s rows=%d", answer.tipo, len(answer.dados))
    return ChatResponse(pergunta=payload.pergunta, resposta=answer)
