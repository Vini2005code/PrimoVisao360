"""Contratos estritos do chat conectado ao prontuario real."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints
ChatType = Literal[
    "total_pacientes",
    "doencas_raras",
    "diabetes_insulina",
    "medicamentos_em_uso",
    "suplementos",
    "risco_cardiometabolico",
    "nao_entendido",
]


class ChatContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class ChatRequest(ChatContract):
    pergunta: Annotated[
        str,
        StringConstraints(strip_whitespace=True, min_length=3, max_length=500),
    ]


class ChatAnswer(ChatContract):
    tipo: ChatType
    mensagem: str = Field(min_length=1, max_length=1_000)
    dados: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    sugestoes: list[str] = Field(default_factory=list, max_length=10)


class ChatResponse(ChatContract):
    pergunta: str
    resposta: ChatAnswer
