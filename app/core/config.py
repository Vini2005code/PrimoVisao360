"""Configuracao imutavel e validada a partir do ambiente."""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from dotenv import load_dotenv


_PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(dotenv_path=_PROJECT_ROOT / ".env", override=False)


_MODELOS_COM_SAIDA_ESTRITA = frozenset(
    {
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
    }
)
_IDENTIFICADOR_SQL = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,62}$")
_SSL_MODES_SEGUROS = frozenset({"require", "verify-ca", "verify-full"})
_HOSTS_LOCAIS = frozenset({"localhost", "127.0.0.1", "::1", "host.docker.internal"})


def _obrigatoria(nome: str, *, minimo: int = 1) -> str:
    valor = os.getenv(nome, "").strip()
    if len(valor) < minimo:
        raise RuntimeError(f"{nome} deve ser definida com ao menos {minimo} caracteres")
    return valor


def _inteiro(nome: str, padrao: int, *, minimo: int, maximo: int) -> int:
    bruto = os.getenv(nome, str(padrao)).strip()
    try:
        valor = int(bruto)
    except ValueError as exc:
        raise RuntimeError(f"{nome} deve ser um numero inteiro") from exc
    if not minimo <= valor <= maximo:
        raise RuntimeError(f"{nome} deve estar entre {minimo} e {maximo}")
    return valor


def _decimal(nome: str, padrao: float, *, minimo: float, maximo: float) -> float:
    bruto = os.getenv(nome, str(padrao)).strip()
    try:
        valor = float(bruto)
    except ValueError as exc:
        raise RuntimeError(f"{nome} deve ser numerica") from exc
    if not minimo <= valor <= maximo:
        raise RuntimeError(f"{nome} deve estar entre {minimo} e {maximo}")
    return valor


def _booleano(nome: str, padrao: bool) -> bool:
    bruto = os.getenv(nome, str(padrao)).strip().casefold()
    if bruto in {"1", "true", "sim", "yes"}:
        return True
    if bruto in {"0", "false", "nao", "não", "no"}:
        return False
    raise RuntimeError(f"{nome} deve ser true ou false")


def _origens_cors(app_env: str) -> tuple[str, ...]:
    bruto = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
    if not bruto:
        return ()

    origens: list[str] = []
    for item in bruto.split(","):
        origem = item.strip().rstrip("/")
        if origem == "*":
            raise RuntimeError("CORS_ALLOWED_ORIGINS nao aceita wildcard")
        partes = urlsplit(origem)
        if (
            partes.scheme not in {"http", "https"}
            or not partes.netloc
            or partes.path
            or partes.query
            or partes.fragment
        ):
            raise RuntimeError(f"Origem CORS invalida: {origem}")
        if (
            app_env.casefold() == "production"
            and partes.scheme != "https"
            and (partes.hostname or "").casefold() not in _HOSTS_LOCAIS
        ):
            raise RuntimeError("Origem CORS remota em producao deve usar HTTPS")
        origens.append(origem)
    return tuple(dict.fromkeys(origens))


def _identificador_sql(nome_variavel: str, padrao: str, *, composto: bool) -> str:
    valor = os.getenv(nome_variavel, padrao).strip()
    partes = valor.split(".")
    limite = 2 if composto else 1
    if len(partes) > limite or any(not _IDENTIFICADOR_SQL.fullmatch(p) for p in partes):
        formato = "schema.tabela" if composto else "coluna"
        raise RuntimeError(f"{nome_variavel} deve ser um identificador SQL no formato {formato}")
    return valor


def _validar_database_url(database_url: str, *, app_env: str) -> None:
    partes = urlsplit(database_url)
    if partes.scheme not in {"postgresql", "postgres"}:
        raise RuntimeError("DATABASE_URL deve usar postgresql:// ou postgres://")
    if not partes.hostname or not partes.path.strip("/"):
        raise RuntimeError("DATABASE_URL deve informar host e nome do banco")
    if app_env.casefold() == "production" and partes.hostname.casefold() not in _HOSTS_LOCAIS:
        sslmode = parse_qs(partes.query).get("sslmode", [""])[-1].casefold()
        if sslmode not in _SSL_MODES_SEGUROS:
            raise RuntimeError(
                "DATABASE_URL remota em producao deve usar sslmode=require, "
                "verify-ca ou verify-full"
            )


@dataclass(frozen=True, slots=True)
class Settings:
    app_env: str
    cors_allowed_origins: tuple[str, ...]
    docs_enabled: bool
    groq_api_key: str
    groq_max_completion_tokens: int
    groq_max_retries: int
    groq_model: str
    groq_timeout_seconds: float
    internal_api_key: str
    log_level: str

    app_name: str = "Primordial Inteligencia 360"
    app_version: str = "1.2.0"
    database_enabled: bool = False
    database_url: str = field(default="", repr=False)
    database_min_pool_size: int = 1
    database_max_pool_size: int = 5
    database_connect_timeout_seconds: float = 5.0
    database_statement_timeout_ms: int = 3_000
    db_schema: str = "ehr_teste"
    voice_enabled: bool = False
    voice_stt_model_path: str = ""
    voice_stt_language: str = "pt"
    voice_stt_device: str = "cpu"
    voice_stt_compute_type: str = "int8"
    voice_stt_cpu_threads: int = 2
    voice_stt_max_concurrency: int = 1
    voice_tts_model_path: str = ""
    voice_tts_config_path: str = ""
    voice_max_audio_bytes: int = 10_485_760
    voice_max_seconds: int = 60
    voice_tts_max_characters: int = 1_500

    @classmethod
    def from_env(cls) -> "Settings":
        app_env = os.getenv("APP_ENV", "production").strip()
        modelo = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b").strip()
        if modelo not in _MODELOS_COM_SAIDA_ESTRITA:
            permitidos = ", ".join(sorted(_MODELOS_COM_SAIDA_ESTRITA))
            raise RuntimeError(
                "GROQ_MODEL deve suportar Structured Outputs estrito. "
                f"Valores permitidos: {permitidos}"
            )

        log_level = os.getenv("LOG_LEVEL", "INFO").strip().upper()
        if log_level not in {"CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"}:
            raise RuntimeError("LOG_LEVEL invalido")

        database_url = os.getenv("DATABASE_URL", "").strip()
        database_enabled = _booleano("DATABASE_ENABLED", bool(database_url))
        if database_enabled:
            if not database_url:
                raise RuntimeError("DATABASE_URL deve ser definida quando DATABASE_ENABLED=true")
            _validar_database_url(database_url, app_env=app_env)

        min_pool = _inteiro("DATABASE_MIN_POOL_SIZE", 1, minimo=1, maximo=10)
        max_pool = _inteiro("DATABASE_MAX_POOL_SIZE", 5, minimo=1, maximo=20)
        if min_pool > max_pool:
            raise RuntimeError("DATABASE_MIN_POOL_SIZE nao pode superar DATABASE_MAX_POOL_SIZE")

        voice_enabled = _booleano("VOICE_ENABLED", False)
        voice_stt_model_path = os.getenv("VOICE_STT_MODEL_PATH", "").strip()
        voice_stt_language = os.getenv("VOICE_STT_LANGUAGE", "pt").strip().casefold()
        if not re.fullmatch(r"[a-z]{2}", voice_stt_language):
            raise RuntimeError("VOICE_STT_LANGUAGE deve usar ISO-639-1")
        voice_stt_device = os.getenv("VOICE_STT_DEVICE", "cpu").strip().casefold()
        if voice_stt_device not in {"cpu", "cuda"}:
            raise RuntimeError("VOICE_STT_DEVICE deve ser cpu ou cuda")
        voice_stt_compute_type = os.getenv(
            "VOICE_STT_COMPUTE_TYPE", "int8"
        ).strip().casefold()
        if voice_stt_compute_type not in {
            "int8",
            "int8_float16",
            "float16",
            "float32",
        }:
            raise RuntimeError("VOICE_STT_COMPUTE_TYPE invalido")
        if voice_stt_device == "cpu" and voice_stt_compute_type in {
            "float16",
            "int8_float16",
        }:
            raise RuntimeError(
                "VOICE_STT_COMPUTE_TYPE deve ser int8 ou float32 em CPU"
            )
        voice_tts_model_path = os.getenv("VOICE_TTS_MODEL_PATH", "").strip()
        voice_tts_config_path = os.getenv("VOICE_TTS_CONFIG_PATH", "").strip()
        if voice_enabled:
            if not voice_stt_model_path:
                raise RuntimeError(
                    "VOICE_STT_MODEL_PATH e obrigatorio quando VOICE_ENABLED=true"
                )
            if not voice_tts_model_path or not voice_tts_config_path:
                raise RuntimeError(
                    "VOICE_TTS_MODEL_PATH e VOICE_TTS_CONFIG_PATH sao obrigatorios"
                )
            if not database_enabled:
                raise RuntimeError(
                    "DATABASE_ENABLED deve ser true quando VOICE_ENABLED=true"
                )

        return cls(
            app_env=app_env,
            cors_allowed_origins=_origens_cors(app_env),
            docs_enabled=_booleano("ENABLE_DOCS", False),
            groq_api_key=_obrigatoria("GROQ_API_KEY", minimo=20),
            groq_max_completion_tokens=_inteiro(
                "GROQ_MAX_COMPLETION_TOKENS", 1200, minimo=256, maximo=4096
            ),
            groq_max_retries=_inteiro("GROQ_MAX_RETRIES", 1, minimo=0, maximo=3),
            groq_model=modelo,
            groq_timeout_seconds=_decimal(
                "GROQ_TIMEOUT_SECONDS", 30.0, minimo=1.0, maximo=120.0
            ),
            internal_api_key=_obrigatoria("INTERNAL_API_KEY", minimo=32),
            log_level=log_level,
            database_enabled=database_enabled,
            database_url=database_url,
            database_min_pool_size=min_pool,
            database_max_pool_size=max_pool,
            database_connect_timeout_seconds=_decimal(
                "DATABASE_CONNECT_TIMEOUT_SECONDS", 5.0, minimo=1.0, maximo=30.0
            ),
            database_statement_timeout_ms=_inteiro(
                "DATABASE_STATEMENT_TIMEOUT_MS", 3_000, minimo=100, maximo=30_000
            ),
            db_schema=_identificador_sql(
                "DB_SCHEMA", "ehr_teste", composto=False
            ),
            voice_enabled=voice_enabled,
            voice_stt_model_path=voice_stt_model_path,
            voice_stt_language=voice_stt_language,
            voice_stt_device=voice_stt_device,
            voice_stt_compute_type=voice_stt_compute_type,
            voice_stt_cpu_threads=_inteiro(
                "VOICE_STT_CPU_THREADS", 2, minimo=1, maximo=16
            ),
            voice_stt_max_concurrency=_inteiro(
                "VOICE_STT_MAX_CONCURRENCY", 1, minimo=1, maximo=4
            ),
            voice_tts_model_path=voice_tts_model_path,
            voice_tts_config_path=voice_tts_config_path,
            voice_max_audio_bytes=_inteiro(
                "VOICE_MAX_AUDIO_BYTES",
                10_485_760,
                minimo=64_000,
                maximo=25_000_000,
            ),
            voice_max_seconds=_inteiro(
                "VOICE_MAX_SECONDS", 60, minimo=2, maximo=120
            ),
            voice_tts_max_characters=_inteiro(
                "VOICE_TTS_MAX_CHARACTERS", 1_500, minimo=100, maximo=4_000
            ),
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings.from_env()
