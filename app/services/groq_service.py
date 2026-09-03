"""Integração assíncrona e validada com o GroqCloud."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import UTC, datetime
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
    PlanejamentoPopulacionalEntrada,
    PlanoConsultaPopulacional,
    RespostaPopulacionalEntrada,
    RespostaPopulacionalSaida,
    Visao360Entrada,
    Visao360Saida,
)
from app.services.prompts import (
    SYSTEM_PROMPT_CHAT_DINAMICO,
    SYSTEM_PROMPT_PLANEJAMENTO_POPULACIONAL,
    SYSTEM_PROMPT_RESPOSTA_POPULACIONAL,
    SYSTEM_PROMPT_VISAO_360,
)


logger = logging.getLogger(__name__)


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


@dataclass(frozen=True, slots=True)
class PopulationPlanGeneration:
    plano: PlanoConsultaPopulacional
    usage: TokenUsage
    provider_latency_ms: int
    model: str


@dataclass(frozen=True, slots=True)
class PopulationAnswerGeneration:
    resposta: RespostaPopulacionalSaida
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

_POPULATION_ANSWER_JSON_SCHEMA: dict[str, object] = {
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

_POPULATION_TOOLS: list[dict[str, object]] = [
    {
        "type": "function",
        "function": {
            "name": "contar_pacientes",
            "description": "Conta todos os pacientes autorizados da clínica.",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "escopo": {"type": "string", "enum": ["clinica"]},
                },
                "required": ["escopo"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "contar_pacientes_por_sexo",
            "description": "Conta pacientes por categoria de sexo registrado.",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "escopo": {"type": "string", "enum": ["clinica"]},
                },
                "required": ["escopo"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calcular_idade_media",
            "description": "Calcula a idade média dos pacientes da clínica.",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "escopo": {"type": "string", "enum": ["clinica"]},
                },
                "required": ["escopo"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_diagnosticos_mais_comuns",
            "description": "Lista diagnósticos agregados mais frequentes.",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "limite": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                    }
                },
                "required": ["limite"],
                "additionalProperties": False,
            },
        },
    },
]

_TOOL_NAME_TO_ENUM = {
    "contar_pacientes": "CONTAR_PACIENTES",
    "contar_pacientes_por_sexo": "CONTAR_PACIENTES_POR_SEXO",
    "calcular_idade_media": "CALCULAR_IDADE_MEDIA",
    "listar_diagnosticos_mais_comuns": "LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
}

_ERROR_TECHNICAL_FIELDS = frozenset({"code", "param", "type"})
_TOOL_DIAGNOSTIC_FIELDS = frozenset(
    {
        "arguments",
        "escopo",
        "function",
        "id",
        "limite",
        "name",
        "tool_calls",
        "type",
    }
)
_ERROR_REDACTED_FIELDS = frozenset(
    {
        "content",
        "context",
        "contexto",
        "data",
        "failed_generation",
        "input",
        "message",
        "messages",
        "payload",
        "pergunta",
        "prompt",
        "question",
        "response",
        "resposta",
        "resultado",
    }
)
_PII_LOG_PATTERNS = (
    re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
    re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)"),
    re.compile(r"(?<!\d)(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}(?!\d)"),
    re.compile(r"(?<!\d)\d{15}(?!\d)"),
    re.compile(
        r"\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç'-]{2,}"
        r"(?:\s+(?:(?:da|de|do|das|dos)\s+)?"
        r"[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç'-]{2,}){1,3}\b"
    ),
)


def _fingerprint(valor: object) -> dict[str, object]:
    serializado = json.dumps(
        valor,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
        default=lambda item: f"<{type(item).__name__}>",
    )
    return {
        "redacted": True,
        "sha256": hashlib.sha256(serializado.encode("utf-8")).hexdigest(),
        "length": len(serializado.encode("utf-8")),
    }


def _sanitizar_corpo_erro(
    valor: object,
    *,
    campo: str = "",
) -> object:
    if valor is None or isinstance(valor, (bool, int, float)):
        return valor
    if isinstance(valor, dict):
        sanitizado: dict[str, object] = {}
        for chave, item in valor.items():
            chave_texto = str(chave)
            chave_normalizada = chave_texto.casefold()
            if chave_normalizada in _ERROR_REDACTED_FIELDS:
                sanitizado[chave_texto] = _fingerprint(item)
            else:
                sanitizado[chave_texto] = _sanitizar_corpo_erro(
                    item,
                    campo=chave_normalizada,
                )
        return sanitizado
    if isinstance(valor, (list, tuple)):
        return [
            _sanitizar_corpo_erro(
                item,
                campo=campo,
            )
            for item in valor
        ]
    if isinstance(valor, str):
        if campo in _ERROR_TECHNICAL_FIELDS:
            return valor[:2_000]
        return _fingerprint(valor)
    return _fingerprint(f"<{type(valor).__name__}>")


def _sanitizar_mensagem_erro(valor: object, pergunta: str) -> object:
    if not isinstance(valor, str):
        return _fingerprint(valor)
    if any(marcador in valor for marcador in ("{", "[", "\n")):
        return _fingerprint(valor)
    sanitizada = re.sub(
        re.escape(pergunta),
        "[INPUT_REDACTED]",
        valor,
        flags=re.IGNORECASE,
    )[:2_000]
    for padrao in _PII_LOG_PATTERNS:
        sanitizada = padrao.sub("[PII_REDACTED]", sanitizada)
    return sanitizada


def _sanitizar_failed_generation(
    valor: object,
    ferramentas: frozenset[str],
    *,
    campo: str = "",
) -> object:
    if isinstance(valor, str) and campo == "arguments":
        try:
            valor = json.loads(valor)
        except json.JSONDecodeError:
            return _fingerprint(valor)
    elif isinstance(valor, str) and not campo:
        try:
            valor = json.loads(valor)
        except json.JSONDecodeError:
            return _fingerprint(valor)
    if valor is None or isinstance(valor, (bool, int, float)):
        return valor
    if isinstance(valor, dict):
        sanitizado: dict[str, object] = {}
        for chave, item in valor.items():
            chave_texto = str(chave)
            chave_normalizada = chave_texto.casefold()
            sanitizado[chave_texto] = (
                _sanitizar_failed_generation(
                    item,
                    ferramentas,
                    campo=chave_normalizada,
                )
                if chave_normalizada in _TOOL_DIAGNOSTIC_FIELDS
                else _fingerprint(item)
            )
        return sanitizado
    if isinstance(valor, (list, tuple)):
        return [
            _sanitizar_failed_generation(item, ferramentas, campo=campo)
            for item in valor
        ]
    if isinstance(valor, str):
        if campo == "name" and valor in ferramentas:
            return valor
        if campo == "type" and valor == "function":
            return valor
        if campo == "escopo" and valor == "clinica":
            return valor
        if campo == "id" and re.fullmatch(r"[A-Za-z0-9._-]{1,128}", valor):
            return valor
    return _fingerprint(valor)


def _registrar_api_status_error(
    exc: APIStatusError,
    *,
    operacao: str,
    modelo: str,
    mensagens: list[dict[str, str]],
    ferramentas: list[dict[str, object]],
    payload_requisicao: dict[str, object],
    pergunta: str,
) -> None:
    nomes_ferramentas = frozenset(
        str(item.get("function", {}).get("name", ""))
        for item in ferramentas
        if isinstance(item.get("function"), dict)
    )
    corpo_original = getattr(exc, "body", None)
    if corpo_original is None:
        corpo_original = getattr(getattr(exc, "response", None), "text", None)
    corpo_sanitizado = _sanitizar_corpo_erro(
        corpo_original,
    )
    erro_original = corpo_original.get("error", corpo_original) if isinstance(
        corpo_original,
        dict,
    ) else {}
    erro_sanitizado = corpo_sanitizado.get("error", corpo_sanitizado) if isinstance(
        corpo_sanitizado,
        dict,
    ) else {}
    cabecalhos = getattr(getattr(exc, "response", None), "headers", {})
    request_id = (
        cabecalhos.get("x-request-id")
        or cabecalhos.get("x-groq-request-id")
        or cabecalhos.get("request-id")
    )
    payload_serializado = json.dumps(
        payload_requisicao,
        ensure_ascii=False,
        separators=(",", ":"),
        default=lambda item: f"<{type(item).__name__}>",
    ).encode("utf-8")
    evento = {
        "timestamp": datetime.now(UTC).isoformat(),
        "status_http": exc.status_code,
        "x_request_id": request_id,
        "response_body_sanitized": corpo_sanitizado,
        "error_type": erro_sanitizado.get("type")
        if isinstance(erro_sanitizado, dict)
        else None,
        "error_code": erro_sanitizado.get("code")
        if isinstance(erro_sanitizado, dict)
        else None,
        "error_message": _sanitizar_mensagem_erro(
            erro_original.get("message"),
            pergunta,
        )
        if isinstance(erro_original, dict) and erro_original.get("message") is not None
        else None,
        "failed_generation": _sanitizar_failed_generation(
            erro_original.get("failed_generation"),
            nomes_ferramentas,
        )
        if isinstance(erro_original, dict)
        and erro_original.get("failed_generation") is not None
        else None,
        "model": modelo,
        "operation": operacao,
        "tools": sorted(nome for nome in nomes_ferramentas if nome),
        "message_count": len(mensagens),
        "message_roles": [mensagem.get("role", "unknown") for mensagem in mensagens],
        "payload_size_bytes": len(payload_serializado),
        "question_sha256": hashlib.sha256(pergunta.encode("utf-8")).hexdigest(),
    }
    logger.error(
        "groq_http_error %s",
        json.dumps(evento, ensure_ascii=True, separators=(",", ":")),
    )


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

    async def plan_population(
        self,
        payload: PlanejamentoPopulacionalEntrada,
    ) -> PopulationPlanGeneration:
        # clinic_id permanece no perímetro interno; somente a pergunta já
        # pseudonimizada é encaminhada ao provedor.
        conteudo_usuario = "PERGUNTA_POPULACIONAL\n" + payload.pergunta
        mensagens = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT_PLANEJAMENTO_POPULACIONAL,
            },
            {"role": "user", "content": conteudo_usuario},
        ]
        payload_requisicao = {
            "model": self._settings.groq_model,
            "messages": mensagens,
            "include_reasoning": False,
            "max_completion_tokens": min(
                self._settings.groq_max_completion_tokens,
                300,
            ),
            "tools": _POPULATION_TOOLS,
            "tool_choice": "required",
            "parallel_tool_calls": False,
            "seed": 42,
            "temperature": 0.0,
        }
        inicio = perf_counter()
        try:
            completion = await self._client.chat.completions.create(
                **payload_requisicao,
            )
        except APITimeoutError as exc:
            raise AIServiceTimeout("tempo limite excedido pelo provedor") from exc
        except RateLimitError as exc:
            _registrar_api_status_error(
                exc,
                operacao="planejar",
                modelo=self._settings.groq_model,
                mensagens=mensagens,
                ferramentas=_POPULATION_TOOLS,
                payload_requisicao=payload_requisicao,
                pergunta=payload.pergunta,
            )
            raise AIServiceUnavailable("limite temporário do provedor") from exc
        except APIStatusError as exc:
            _registrar_api_status_error(
                exc,
                operacao="planejar",
                modelo=self._settings.groq_model,
                mensagens=mensagens,
                ferramentas=_POPULATION_TOOLS,
                payload_requisicao=payload_requisicao,
                pergunta=payload.pergunta,
            )
            raise AIServiceUnavailable("falha temporária do provedor") from exc
        except APIConnectionError as exc:
            raise AIServiceUnavailable("falha temporária do provedor") from exc

        latencia_ms = round((perf_counter() - inicio) * 1000)
        message = completion.choices[0].message if completion.choices else None
        tool_calls = getattr(message, "tool_calls", None) if message else None
        if not tool_calls or len(tool_calls) != 1:
            raise AIServiceInvalidResponse("planejamento sem uma única ferramenta")

        function = getattr(tool_calls[0], "function", None)
        tool_name = getattr(function, "name", "")
        if tool_name not in _TOOL_NAME_TO_ENUM:
            raise AIServiceInvalidResponse("ferramenta populacional não permitida")

        try:
            arguments = json.loads(getattr(function, "arguments", "{}") or "{}")
        except (json.JSONDecodeError, TypeError) as exc:
            raise AIServiceInvalidResponse("argumentos de ferramenta inválidos") from exc
        if not isinstance(arguments, dict):
            raise AIServiceInvalidResponse("argumentos de ferramenta inválidos")

        campos_permitidos = (
            {"limite"}
            if tool_name == "listar_diagnosticos_mais_comuns"
            else {"escopo"}
        )
        if set(arguments) - campos_permitidos:
            raise AIServiceInvalidResponse("argumento de ferramenta não permitido")
        if tool_name != "listar_diagnosticos_mais_comuns" and arguments.get(
            "escopo"
        ) not in {None, "clinica"}:
            raise AIServiceInvalidResponse("escopo populacional inválido")

        try:
            plano = PlanoConsultaPopulacional.model_validate(
                {
                    "ferramenta": _TOOL_NAME_TO_ENUM[tool_name],
                    "limite": arguments.get("limite"),
                }
            )
        except (ValidationError, ValueError) as exc:
            raise AIServiceInvalidResponse("plano populacional inválido") from exc

        return PopulationPlanGeneration(
            plano=plano,
            usage=self._extract_usage(completion),
            provider_latency_ms=latencia_ms,
            model=self._settings.groq_model,
        )

    async def answer_population(
        self,
        payload: RespostaPopulacionalEntrada,
    ) -> PopulationAnswerGeneration:
        dados_autorizados = payload.model_dump(
            mode="json",
            exclude={"clinic_id", "lgpd_nivel"},
        )
        conteudo_usuario = (
            "RESULTADO_POPULACIONAL_JSON\n"
            + json.dumps(
                dados_autorizados,
                ensure_ascii=False,
                separators=(",", ":"),
            )
        )
        mensagens = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT_RESPOSTA_POPULACIONAL,
            },
            {"role": "user", "content": conteudo_usuario},
        ]
        payload_requisicao = {
            "model": self._settings.groq_model,
            "messages": mensagens,
            "include_reasoning": False,
            "max_completion_tokens": self._settings.groq_max_completion_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "primordial_resposta_populacional",
                    "strict": True,
                    "schema": _POPULATION_ANSWER_JSON_SCHEMA,
                },
            },
            "seed": 42,
            "temperature": 0.0,
        }
        inicio = perf_counter()
        try:
            completion = await self._client.chat.completions.create(
                **payload_requisicao,
            )
        except APITimeoutError as exc:
            raise AIServiceTimeout("tempo limite excedido pelo provedor") from exc
        except RateLimitError as exc:
            _registrar_api_status_error(
                exc,
                operacao="responder",
                modelo=self._settings.groq_model,
                mensagens=mensagens,
                ferramentas=[],
                payload_requisicao=payload_requisicao,
                pergunta=payload.pergunta,
            )
            raise AIServiceUnavailable("limite temporário do provedor") from exc
        except APIStatusError as exc:
            _registrar_api_status_error(
                exc,
                operacao="responder",
                modelo=self._settings.groq_model,
                mensagens=mensagens,
                ferramentas=[],
                payload_requisicao=payload_requisicao,
                pergunta=payload.pergunta,
            )
            raise AIServiceUnavailable("falha temporária do provedor") from exc
        except APIConnectionError as exc:
            raise AIServiceUnavailable("falha temporária do provedor") from exc

        latencia_ms = round((perf_counter() - inicio) * 1000)
        conteudo = completion.choices[0].message.content if completion.choices else None
        if not conteudo:
            raise AIServiceInvalidResponse("resposta vazia do provedor")
        try:
            resposta = RespostaPopulacionalSaida.model_validate_json(conteudo)
        except (ValidationError, ValueError) as exc:
            raise AIServiceInvalidResponse("resposta incompatível do provedor") from exc

        return PopulationAnswerGeneration(
            resposta=resposta,
            usage=self._extract_usage(completion),
            provider_latency_ms=latencia_ms,
            model=self._settings.groq_model,
        )

    def _extract_usage(self, completion: object) -> TokenUsage:
        usage = getattr(completion, "usage", None)
        return TokenUsage(
            prompt_tokens=int(getattr(usage, "prompt_tokens", 0) or 0),
            completion_tokens=int(getattr(usage, "completion_tokens", 0) or 0),
            total_tokens=int(getattr(usage, "total_tokens", 0) or 0),
        )
