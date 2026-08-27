"""Integração assíncrona e validada com o GroqCloud."""

from __future__ import annotations

import json
from dataclasses import dataclass
from time import perf_counter

from groq import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncGroq,
    RateLimitError,
)
from pydantic import ValidationError

from app.core.config import Settings
from app.schemas import (
    ChatDinamicoEntrada,
    ChatDinamicoSaida,
    Visao360Entrada,
    Visao360Saida,
)
from app.services.prompts import (
    SYSTEM_PROMPT_CHAT_DINAMICO,
    SYSTEM_PROMPT_VISAO_360,
)


class AIServiceError(RuntimeError):
    """Erro seguro e esperado da integração de IA."""


class AIServiceTimeout(AIServiceError):
    """O provedor excedeu o tempo limite."""


class AIServiceUnavailable(AIServiceError):
    """O provedor está temporariamente indisponível."""


class AIServiceInvalidResponse(AIServiceError):
    """O provedor devolveu conteúdo incompatível ou inseguro."""


@dataclass(frozen=True, slots=True)
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True, slots=True)
class VisionGeneration:
    insights: Visao360Saida
    usage: TokenUsage
    provider_latency_ms: int
    model: str


@dataclass(frozen=True, slots=True)
class ChatGeneration:
    resposta: ChatDinamicoSaida
    usage: TokenUsage
    provider_latency_ms: int
    model: str


_OUTPUT_JSON_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "resumo_executivo": {"type": "string"},
        "alertas_criticos": {
            "type": "array",
            "items": {"type": "string"},
        },
        "tendencias": {
            "type": "array",
            "items": {"type": "string"},
        },
        "status_processamento": {
            "type": "string",
            "enum": ["sucesso"],
        },
    },
    "required": [
        "resumo_executivo",
        "alertas_criticos",
        "tendencias",
        "status_processamento",
    ],
    "additionalProperties": False,
}

_CHAT_OUTPUT_JSON_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "resposta": {"type": "string"},
        "status_processamento": {
            "type": "string",
            "enum": ["sucesso"],
        },
    },
    "required": ["resposta", "status_processamento"],
    "additionalProperties": False,
}


class GroqVisionService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncGroq(
            api_key=settings.groq_api_key,
            max_retries=settings.groq_max_retries,
            timeout=settings.groq_timeout_seconds,
        )

    async def close(self) -> None:
        await self._client.close()

    async def generate(self, payload: Visao360Entrada) -> VisionGeneration:
        # clinic_id é usado apenas pelo serviço para autenticação/auditoria e
        # nunca atravessa a fronteira do provedor de IA.
        dados_clinicos = payload.model_dump(
            mode="json",
            exclude={"clinic_id", "lgpd_nivel"},
        )
        conteudo_usuario = (
            "DADOS_CLINICOS_JSON\n"
            + json.dumps(
                dados_clinicos,
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )

        inicio = perf_counter()
        try:
            completion = await self._client.chat.completions.create(
                model=self._settings.groq_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_VISAO_360},
                    {"role": "user", "content": conteudo_usuario},
                ],
                include_reasoning=False,
                max_completion_tokens=self._settings.groq_max_completion_tokens,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "primordial_visao_360",
                        "strict": True,
                        "schema": _OUTPUT_JSON_SCHEMA,
                    },
                },
                seed=42,
                temperature=0.0,
            )
        except APITimeoutError as exc:
            raise AIServiceTimeout("tempo limite excedido pelo provedor") from exc
        except RateLimitError as exc:
            raise AIServiceUnavailable("limite temporário do provedor") from exc
        except (APIConnectionError, APIStatusError) as exc:
            raise AIServiceUnavailable("falha temporária do provedor") from exc

        latencia_ms = round((perf_counter() - inicio) * 1000)
        conteudo = completion.choices[0].message.content if completion.choices else None
        if not conteudo:
            raise AIServiceInvalidResponse("resposta vazia do provedor")

        try:
            insights = Visao360Saida.model_validate_json(conteudo)
        except (ValidationError, ValueError) as exc:
            raise AIServiceInvalidResponse("resposta incompatível do provedor") from exc

        usage = completion.usage
        metricas = TokenUsage(
            prompt_tokens=int(getattr(usage, "prompt_tokens", 0) or 0),
            completion_tokens=int(getattr(usage, "completion_tokens", 0) or 0),
            total_tokens=int(getattr(usage, "total_tokens", 0) or 0),
        )
        return VisionGeneration(
            insights=insights,
            usage=metricas,
            provider_latency_ms=latencia_ms,
            model=self._settings.groq_model,
        )

    async def generate_chat(
        self,
        payload: ChatDinamicoEntrada,
    ) -> ChatGeneration:
        contexto_autorizado = payload.model_dump(
            mode="json",
            exclude={"clinic_id", "lgpd_nivel"},
        )
        conteudo_usuario = (
            "CONTEXTO_CHAT_JSON\n"
            + json.dumps(
                contexto_autorizado,
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )

        inicio = perf_counter()
        try:
            completion = await self._client.chat.completions.create(
                model=self._settings.groq_model,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT_CHAT_DINAMICO},
                    {"role": "user", "content": conteudo_usuario},
                ],
                include_reasoning=False,
                max_completion_tokens=self._settings.groq_max_completion_tokens,
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "primordial_chat_dinamico",
                        "strict": True,
                        "schema": _CHAT_OUTPUT_JSON_SCHEMA,
                    },
                },
                seed=42,
                temperature=0.0,
            )
        except APITimeoutError as exc:
            raise AIServiceTimeout("tempo limite excedido pelo provedor") from exc
        except RateLimitError as exc:
            raise AIServiceUnavailable("limite temporário do provedor") from exc
        except (APIConnectionError, APIStatusError) as exc:
            raise AIServiceUnavailable("falha temporária do provedor") from exc

        latencia_ms = round((perf_counter() - inicio) * 1000)
        conteudo = completion.choices[0].message.content if completion.choices else None
        if not conteudo:
            raise AIServiceInvalidResponse("resposta vazia do provedor")

        try:
            resposta = ChatDinamicoSaida.model_validate_json(conteudo)
        except (ValidationError, ValueError) as exc:
            raise AIServiceInvalidResponse("resposta incompatível do provedor") from exc

        usage = completion.usage
        metricas = TokenUsage(
            prompt_tokens=int(getattr(usage, "prompt_tokens", 0) or 0),
            completion_tokens=int(getattr(usage, "completion_tokens", 0) or 0),
            total_tokens=int(getattr(usage, "total_tokens", 0) or 0),
        )
        return ChatGeneration(
            resposta=resposta,
            usage=metricas,
            provider_latency_ms=latencia_ms,
            model=self._settings.groq_model,
        )
