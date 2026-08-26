"""Contratos da interface incorporavel do Primordial DATA.

Estes modelos descrevem somente as respostas que o navegador recebe do Backend
Java. O FastAPI entrega a casca visual e nunca recebe o prontuario reidentificado.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WebContract(BaseModel):
    """Contrato estrito compartilhado pela interface web."""

    model_config = ConfigDict(extra="forbid", strict=True)


class ClinicalChart(WebContract):
    type: Literal["bar", "line", "pie", "doughnut"]
    title: str = Field(min_length=1, max_length=200)
    labels: list[str] = Field(min_length=1, max_length=1_000)
    values: list[float | int] = Field(min_length=1, max_length=1_000)

    @model_validator(mode="after")
    def validate_dimensions(self) -> "ClinicalChart":
        if len(self.labels) != len(self.values):
            raise ValueError("labels e values devem possuir o mesmo tamanho")
        if any(not label.strip() or len(label) > 120 for label in self.labels):
            raise ValueError("cada rotulo deve possuir entre 1 e 120 caracteres")
        return self


class ChatMessage(WebContract):
    id: str = Field(min_length=1, max_length=100)
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4_000)
    created_at: datetime
    chart_data: ClinicalChart | None = None


class Conversation(WebContract):
    conversation_id: str | None = Field(default=None, min_length=1, max_length=100)
    messages: list[ChatMessage] = Field(default_factory=list, max_length=500)
    updated_at: datetime | None = None


class SendMessageRequest(WebContract):
    message: str = Field(min_length=1, max_length=4_000)


class SendMessageResponse(WebContract):
    conversation_id: str | None = Field(default=None, min_length=1, max_length=100)
    assistant_message: ChatMessage
    cached: bool = False
    status_processamento: Literal["sucesso"] = "sucesso"

    @model_validator(mode="after")
    def validate_assistant(self) -> "SendMessageResponse":
        if self.assistant_message.role != "assistant":
            raise ValueError("assistant_message deve possuir role assistant")
        return self


class SaveItemRequest(WebContract):
    source_message_id: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=4_000)
    chart_data: ClinicalChart | None = None

    @model_validator(mode="after")
    def validate_content(self) -> "SaveItemRequest":
        if self.content is None and self.chart_data is None:
            raise ValueError("o salvamento deve conter texto ou grafico")
        return self


class SavedItem(SaveItemRequest):
    id: str = Field(min_length=1, max_length=100)
    created_at: datetime


class PageBootstrap(WebContract):
    conversation: Conversation
    saved_items: list[SavedItem] = Field(default_factory=list, max_length=500)

