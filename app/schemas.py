"""Contratos estritos e pseudonimizados da API Visão 360.

Este módulo é uma barreira de segurança, não um mecanismo de anonimização.
O backend Java continua responsável por remover PII antes da chamada.
"""

from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Annotated, Literal, TypeAlias
from uuid import UUID

from pydantic import (
    AfterValidator,
    BaseModel,
    BeforeValidator,
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
_CHAVES_UUID_OPACAS = frozenset({"clinicid", "idpseudonimo"})

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
_MARCADOR_DIRETO_REMOVIDO = re.compile(
    r"\b(?:cpf|rg|cns|e-?mail|telefone|celular|whatsapp|endereço|endereco|"
    r"cep|nome\s+completo|data\s+de\s+nascimento|prontuário|prontuario)"
    r"\s*[:=]?\s*\[(?:CPF|RG|CNS|EMAIL|TELEFONE|CEP|DADO)_REMOVIDO\]",
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
        # Marcadores produzidos pelo gateway Java comprovam que o valor direto
        # foi removido; o rótulo clínico isolado não deve causar um falso 422.
        conteudo_validado = _MARCADOR_DIRETO_REMOVIDO.sub(
            "[DADO_REMOVIDO]",
            conteudo_validado,
        )
        for categoria, padrao in _PADROES_PII:
            if padrao.search(conteudo_validado):
                raise ValueError(
                    f"LGPD: conteúdo com padrão de {categoria} não é permitido"
                )
    elif isinstance(valor, dict):
        for chave, item in valor.items():
            if (
                isinstance(chave, str)
                and _normalizar_chave(chave) in _CHAVES_UUID_OPACAS
            ):
                continue
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


def _converter_data_clinica_tolerante(valor: object) -> object:
    if not isinstance(valor, str):
        return valor
    texto = valor.strip()
    try:
        if "T" not in texto:
            return date.fromisoformat(texto)
        normalizado = texto[:-1] + "+00:00" if texto.endswith("Z") else texto
        return datetime.fromisoformat(normalizado)
    except ValueError:
        return texto


def _converter_valor_clinico_tolerante(valor: object) -> object:
    if not isinstance(valor, str):
        return valor
    texto = valor.strip()
    try:
        convertido = Decimal(texto.replace(",", "."))
    except InvalidOperation:
        return texto
    return convertido if convertido.is_finite() else texto


DataClinica: TypeAlias = Annotated[
    date | datetime | str,
    BeforeValidator(_converter_data_clinica_tolerante),
]
ValorClinico: TypeAlias = Annotated[
    Decimal | int | float | str,
    BeforeValidator(_converter_valor_clinico_tolerante),
]


class SchemaEstrito(BaseModel):
    """Contrato interoperável; tolera extensões do gateway Java."""

    model_config = ConfigDict(
        allow_inf_nan=False,
        extra="allow",
        hide_input_in_errors=True,
        strict=False,
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
        # UUIDs opacos são identificadores técnicos permitidos. Validá-los
        # como texto faria seus primeiros oito dígitos coincidirem por acaso
        # com o padrão conservador de CEP.
        if (
            info.field_name
            and _normalizar_chave(info.field_name) in _CHAVES_UUID_OPACAS
        ):
            return valor
        _rejeitar_padroes_pii(valor)
        return valor


class DiagnosticoEntrada(SchemaSemPII):
    codigo: CodigoClinico | None = None
    descricao: TextoCurto
    status: StatusClinico | None = None
    diagnosticado_em: DataClinica | None = None


class PacienteClinicoEntrada(SchemaSemPII):
    id_pseudonimo: UUIDDeJSON
    idade: Annotated[int, Field(ge=0, le=130)]
    sexo: CodigoDominio
    status: StatusClinico
    diagnosticos: Annotated[list[DiagnosticoEntrada], Field(max_length=100)]


class ExameEntrada(SchemaSemPII):
    tipo: TextoCurto | None = None
    resultado_texto: TextoClinico
    processado_em: DataClinica | None = None


class SinalVitalEntrada(SchemaSemPII):
    tipo: TextoCurto
    valor: ValorClinico
    unidade: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=30),
    ] | None = None
    aferido_em: DataClinica | None = None


class AlergiaEntrada(SchemaSemPII):
    substancia: TextoCurto
    reacao: TextoCurto | None = None
    gravidade: StatusClinico | None = None


class EvolucaoEntrada(SchemaSemPII):
    texto: TextoEvolucao
    registrada_em: DataClinica | None = None
    tipo: TextoCurto | None = None


class MedicamentoEntrada(SchemaSemPII):
    nome_medicamento: TextoCurto
    dose: TextoCurto | None = None
    unidade: TextoCurto | None = None
    via: TextoCurto | None = None
    frequencia: TextoCurto | None = None
    iniciado_em: DataClinica | None = None
    encerrado_em: DataClinica | None = None
    status: StatusClinico | None = None


class Visao360Entrada(SchemaSemPII):
    clinic_id: UUIDDeJSON
    lgpd_nivel: Literal["pseudonimizado"]
    paciente: PacienteClinicoEntrada
    exames: Annotated[list[ExameEntrada], Field(max_length=100)]
    sinais_vitais: Annotated[list[SinalVitalEntrada], Field(max_length=1_000)]
    alergias: Annotated[list[AlergiaEntrada], Field(max_length=500)]
    evolucoes: Annotated[list[EvolucaoEntrada], Field(max_length=2_000)]
    medicamentos: Annotated[
        list[MedicamentoEntrada],
        Field(max_length=1_000),
    ] = Field(default_factory=list)

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


class QuantidadePorSexoChatEntrada(SchemaSemPII):
    sexo: CodigoDominio
    quantidade: Annotated[int, Field(ge=0)]


class EstatisticasClinicaChatEntrada(SchemaSemPII):
    total_pacientes: Annotated[int, Field(ge=0)]
    pacientes_por_sexo: Annotated[
        list[QuantidadePorSexoChatEntrada],
        Field(max_length=50),
    ]


class ContextoClinicoChatEntrada(SchemaSemPII):
    paciente: PacienteClinicoEntrada
    exames: Annotated[list[ExameEntrada], Field(max_length=100)]
    sinais_vitais: Annotated[list[SinalVitalEntrada], Field(max_length=1_000)]
    alergias: Annotated[list[AlergiaEntrada], Field(max_length=500)]
    evolucoes: Annotated[list[EvolucaoEntrada], Field(max_length=2_000)]
    medicamentos: Annotated[
        list[MedicamentoEntrada],
        Field(max_length=1_000),
    ] = Field(default_factory=list)
    insights_persistidos: Annotated[
        list[InsightPersistidoChatEntrada],
        Field(max_length=500),
    ]
    estatisticas_clinica: EstatisticasClinicaChatEntrada | None = None


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


FerramentaPopulacionalTipo: TypeAlias = Literal[
    "CONTAR_PACIENTES",
    "CONTAR_PACIENTES_POR_SEXO",
    "CALCULAR_IDADE_MEDIA",
    "LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
]


class PlanejamentoPopulacionalEntrada(SchemaSemPII):
    clinic_id: UUIDDeJSON
    lgpd_nivel: Literal["pseudonimizado"]
    pergunta: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=3, max_length=1_000),
    ]

    @field_validator("clinic_id")
    @classmethod
    def clinic_id_nao_pode_ser_nulo(cls, valor: UUID) -> UUID:
        if valor.int == 0:
            raise ValueError("clinic_id não pode ser o UUID nulo")
        return valor


class PlanoConsultaPopulacional(SchemaEstrito):
    ferramenta: FerramentaPopulacionalTipo
    limite: Annotated[int, Field(ge=1, le=50)] | None = None

    @model_validator(mode="after")
    def validar_argumentos_da_ferramenta(self) -> "PlanoConsultaPopulacional":
        aceita_limite = self.ferramenta == "LISTAR_DIAGNOSTICOS_MAIS_COMUNS"
        if not aceita_limite and self.limite is not None:
            raise ValueError("a ferramenta selecionada não aceita limite")
        return self


class CategoriaAgregadaPopulacional(SchemaSemPII):
    categoria: TextoCurto
    quantidade: Annotated[int, Field(ge=5)]


class ResultadoAgregadoPopulacional(SchemaSemPII):
    ferramenta: FerramentaPopulacionalTipo
    valor: Annotated[
        Decimal,
        Field(ge=0, max_digits=18, decimal_places=4),
    ] | None = None
    unidade: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=40),
    ]
    registros_considerados: Annotated[int, Field(ge=0)]
    categorias: Annotated[
        list[CategoriaAgregadaPopulacional],
        Field(max_length=50),
    ]
    dados_suprimidos: bool

    @model_validator(mode="after")
    def validar_formato_do_resultado(self) -> "ResultadoAgregadoPopulacional":
        resultado_por_categorias = self.ferramenta in {
            "CONTAR_PACIENTES_POR_SEXO",
            "LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
        }
        if resultado_por_categorias and self.valor is not None:
            raise ValueError("resultado por categorias não deve conter valor escalar")
        if not resultado_por_categorias and self.categorias:
            raise ValueError("resultado escalar não deve conter categorias")
        return self


class RespostaPopulacionalEntrada(SchemaSemPII):
    clinic_id: UUIDDeJSON
    lgpd_nivel: Literal["pseudonimizado"]
    pergunta: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=3, max_length=1_000),
    ]
    resultado_agregado: ResultadoAgregadoPopulacional

    @field_validator("clinic_id")
    @classmethod
    def clinic_id_nao_pode_ser_nulo(cls, valor: UUID) -> UUID:
        if valor.int == 0:
            raise ValueError("clinic_id não pode ser o UUID nulo")
        return valor


class RespostaPopulacionalSaida(SchemaSemPII):
    resposta: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=1, max_length=8_000),
    ]
    status_processamento: Literal["sucesso"]
