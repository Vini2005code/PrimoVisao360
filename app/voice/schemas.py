"""Mensagens de controle do WebSocket de voz."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class VoiceContract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class VoiceStart(VoiceContract):
    type: Literal["start"]
    mime_type: Literal[
        "audio/webm",
        "audio/webm;codecs=opus",
        "audio/ogg",
        "audio/ogg;codecs=opus",
    ]
    clinic_id: UUID | None = None
    patient_id: UUID | None = None

    @field_validator("clinic_id", "patient_id")
    @classmethod
    def reject_null_uuid(cls, value: UUID | None) -> UUID | None:
        if value is not None and value.int == 0:
            raise ValueError("UUID nulo nao e permitido")
        return value


class VoiceCommand(VoiceContract):
    type: Literal["commit", "cancel"]


class VoiceInsight(VoiceContract):
    mensagem: str = Field(min_length=1, max_length=1_500)
    status_processamento: Literal["sucesso"] = "sucesso"

