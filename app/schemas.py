"""Contratos estritos e pseudonimizados da API Visão 360.

Este módulo é uma barreira de segurança, não um mecanismo de anonimização.
O backend Java continua responsável por remover PII antes da chamada.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime
from typing import Annotated, Literal, TypeAlias
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    ValidationInfo,
    field_validator,
    model_validator,
)


# Chaves equivalentes são normalizadas para minúsculas, sem acentos e sem
# separadores. Assim, "nome_completo", "nomeCompleto" e "Nome Completo"
# são tratadas da mesma forma.
_CHAVES_PII = frozenset(
    {
        "address",
        "avatar",
        "birthdate",
        "cartaosus",
        "celular",
        "cns",
        "correioeletronico",
        "cpf",
        "datanascimento",
        "document",
        "documentnumber",
        "documento",
        "email",
        "endereco",
        "fathername",
        "foto",
        "fullname",
        "ip",
        "ipaddress",
        "logradouro",
        "mae",
        "medicalrecordnumber",
        "mobile",
        "mothername",
        "nome",
        "nomecompleto",
        "nomemae",
        "nomepai",
        "nomesocial",
        "numeroendereco",
        "pai",
        "phone",
        "photo",
        "postalcode",
        "prontuario",
        "rg",
        "socialname",
        "street",
        "telefone",
        "userid",
        "whatsapp",
        "zipcode",
    }
)

# Os padrões são intencionalmente conservadores: um falso positivo interrompe
# a requisição para revisão, enquanto um falso negativo poderia expor PII.
_PADROES_PII: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "rótulo identificável",
        re.compile(
            r"\b(?:cpf|rg|cns|e-?mail|telefone|celular|whatsapp|endereço|"
            r"endereco|cep|nome\s+completo|data\s+de\s+nascimento|prontuário|"
            r"prontuario)\s*[:=]",
            re.IGNORECASE,
        ),
    ),
    (
        "CPF",
        re.compile(r"(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)"),
    ),
    (
        "e-mail",
        re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
    ),
    (
        "telefone",
        re.compile(r"(?<!\d)(?:\+?55\s*)?\(?\d{2}\)?[\s.-]*9?\d{4}[\s.-]*\d{4}(?!\d)"),
    ),
    (
        "CEP",
        re.compile(r"(?<!\d)\d{5}-?\d{3}(?!\d)"),
    ),
    (
        "CNS",
        re.compile(r"(?<!\d)\d{15}(?!\d)"),
    ),
    (
        "endereço IP",
        re.compile(
            r"\b(?:25[0-5]|2[0-4]\d|1?\d?\d)"
            r"(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b"
        ),
    ),
)
_TOKEN_PACIENTE_PSEUDONIMIZADO = re.compile(
    r"\bPACIENTE_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-"
    r"[89ab][0-9a-f]{3}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)


def _normalizar_chave(chave: str) -> str:
    sem_acentos = "".join(
        caractere
        for caractere in unicodedata.normalize("NFKD", chave)
        if not unicodedata.combining(caractere)
    )
    return re.sub(r"[^a-z0-9]", "", sem_acentos.casefold())


def _rejeitar_chaves_pii(valor: object) -> None:
    if isinstance(valor, dict):
        for chave, item in valor.items():
            if isinstance(chave, str) and _normalizar_chave(chave) in _CHAVES_PII:
                raise ValueError(
                    "LGPD: o payload contém uma chave associada a dado identificável"
                )
            _rejeitar_chaves_pii(item)
    elif isinstance(valor, (list, tuple)):
        for item in valor:
            _rejeitar_chaves_pii(item)


def _rejeitar_padroes_pii(valor: object) -> None:
    if isinstance(valor, str):
        conteudo_validado = _TOKEN_PACIENTE_PSEUDONIMIZADO.sub(
            "[TOKEN_PACIENTE]",
            valor,
        )
        for categoria, padrao in _PADROES_PII:
            if padrao.search(conteudo_validado):
                raise ValueError(
                    f"LGPD: conteúdo com padrão de {categoria} não é permitido"
                )
    elif isinstance(valor, dict):
        for item in valor.values():
            _rejeitar_padroes_pii(item)
    elif isinstance(valor, (list, tuple)):
        for item in valor:
            _rejeitar_padroes_pii(item)


def _validar_data_iso(valor: str) -> str:
    try:
        data = date.fromisoformat(valor)
    except ValueError as exc:
        raise ValueError("deve ser uma data válida no formato AAAA-MM-DD") from exc

    if data.isoformat() != valor:
        raise ValueError("deve usar o formato canônico AAAA-MM-DD")
    return valor


def _validar_data_hora_iso(valor: str) -> str:
    try:
        normalizado = valor[:-1] + "+00:00" if valor.endswith("Z") else valor
        data_hora = datetime.fromisoformat(normalizado)
    except ValueError as exc:
        raise ValueError("deve ser uma data e hora ISO-8601 válida") from exc
    if data_hora.tzinfo is None:
        raise ValueError("deve incluir fuso horário")
    return valor


TextoCurto: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=500),
]
TextoClinico: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100_000),
]
TextoEvolucao: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=50_000),
]
TextoInsight: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1_000),
]
CodigoClinico: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=40),
]
CodigoDominio: TypeAlias = Annotated[
    str,
    StringConstraints(pattern=r"^[A-Z][A-Z0-9_]{0,31}$"),
]
StatusClinico: TypeAlias = Annotated[
    str,
    StringConstraints(pattern=r"^[a-z][a-z0-9_-]{0,31}$"),
]
DataISO: TypeAlias = Annotated[
    str,
    StringConstraints(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    AfterValidator(_validar_data_iso),
]
DataHoraISO: TypeAlias = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=20, max_length=40),
    AfterValidator(_validar_data_hora_iso),
]
UUIDDeJSON: TypeAlias = Annotated[UUID, Field(strict=False)]


class SchemaEstrito(BaseModel):
    """Base imutável quanto ao contrato e sem coerções silenciosas."""

    model_config = ConfigDict(
        allow_inf_nan=False,
        extra="forbid",
        hide_input_in_errors=True,
        strict=True,
        str_strip_whitespace=True,
        validate_assignment=True,
    )


class SchemaSemPII(SchemaEstrito):
    """Defesa em profundidade contra chaves e padrões comuns de PII."""

    @model_validator(mode="before")
    @classmethod
    def rejeitar_chaves_identificaveis(cls, dados: object) -> object:
        _rejeitar_chaves_pii(dados)
        return dados

    @field_validator("*", mode="before")
    @classmethod
    def rejeitar_conteudo_identificavel(
        cls,
        valor: object,
        info: ValidationInfo,
    ) -> object:
        # O nome do campo é deliberadamente ignorado na mensagem para não
        # replicar conteúdo potencialmente sensível em logs de validação.
        _ = info.field_name
        _rejeitar_padroes_pii(valor)
        return valor


class DiagnosticoEntrada(SchemaSemPII):
    codigo: CodigoClinico | None = None
    descricao: TextoCurto
    status: StatusClinico | None = None
    diagnosticado_em: DataISO | None = None


class PacienteClinicoEntrada(SchemaSemPII):
    idade: Annotated[int, Field(ge=0, le=130)]
    sexo: CodigoDominio
    status: StatusClinico
    diagnosticos: Annotated[list[DiagnosticoEntrada], Field(max_length=100)]


class ExameEntrada(SchemaSemPII):
    tipo: TextoCurto
    resultado_texto: TextoClinico
    processado_em: DataISO


class SinalVitalEntrada(SchemaSemPII):
    tipo: TextoCurto
    valor: int | float
    unidade: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=30),
    ]
    aferido_em: DataISO


class AlergiaEntrada(SchemaSemPII):
    substancia: TextoCurto
    reacao: TextoCurto | None = None
    gravidade: StatusClinico | None = None


class EvolucaoEntrada(SchemaSemPII):
    texto: TextoEvolucao
    registrada_em: DataISO
    tipo: TextoCurto | None = None


class Visao360Entrada(SchemaSemPII):
    clinic_id: UUIDDeJSON
    lgpd_nivel: Literal["pseudonimizado"]
    paciente: PacienteClinicoEntrada
    exames: Annotated[list[ExameEntrada], Field(max_length=100)]
    sinais_vitais: Annotated[list[SinalVitalEntrada], Field(max_length=1_000)]
    alergias: Annotated[list[AlergiaEntrada], Field(max_length=500)]
    evolucoes: Annotated[list[EvolucaoEntrada], Field(max_length=2_000)]

    @field_validator("clinic_id")
    @classmethod
    def clinic_id_nao_pode_ser_nulo(cls, valor: UUID) -> UUID:
        if valor.int == 0:
            raise ValueError("clinic_id não pode ser o UUID nulo")
        return valor


class Visao360Saida(SchemaSemPII):
    resumo_executivo: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=4_000),
    ]
    alertas_criticos: Annotated[list[TextoInsight], Field(max_length=50)]
    tendencias: Annotated[list[TextoInsight], Field(max_length=50)]
    status_processamento: Literal["sucesso"]


class InsightPersistidoChatEntrada(SchemaSemPII):
    gerado_em: DataHoraISO
    resumo_executivo: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=4_000),
    ]
    alertas_criticos: Annotated[list[TextoInsight], Field(max_length=50)]
    tendencias: Annotated[list[TextoInsight], Field(max_length=50)]


class ContextoClinicoChatEntrada(SchemaSemPII):
    paciente: PacienteClinicoEntrada
    exames: Annotated[list[ExameEntrada], Field(max_length=100)]
    sinais_vitais: Annotated[list[SinalVitalEntrada], Field(max_length=1_000)]
    alergias: Annotated[list[AlergiaEntrada], Field(max_length=500)]
    evolucoes: Annotated[list[EvolucaoEntrada], Field(max_length=2_000)]
    insights_persistidos: Annotated[
        list[InsightPersistidoChatEntrada],
        Field(max_length=500),
    ]


class ChatDinamicoEntrada(SchemaSemPII):
    clinic_id: UUIDDeJSON
    lgpd_nivel: Literal["pseudonimizado"]
    pergunta: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=3, max_length=1_000),
    ]
    contexto_clinico: ContextoClinicoChatEntrada

    @field_validator("clinic_id")
    @classmethod
    def clinic_id_nao_pode_ser_nulo(cls, valor: UUID) -> UUID:
        if valor.int == 0:
            raise ValueError("clinic_id não pode ser o UUID nulo")
        return valor


class ChatDinamicoSaida(SchemaSemPII):
    resposta: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=8_000),
    ]
    status_processamento: Literal["sucesso"]
