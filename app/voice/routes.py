"""WebSocket binario do modo de voz, sem escrita em disco."""

from __future__ import annotations

import json
import logging
import secrets
from time import monotonic

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError

from app.core.config import Settings, get_settings
from app.voice.providers import (
    VoiceCapacityExceeded,
    VoicePipelineService,
    VoiceProviderError,
)
from app.voice.schemas import VoiceCommand, VoiceStart
from app.voice.security import release_ephemeral_memory, zeroize


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["Voz efemera"])


def _is_local_client(websocket: WebSocket, settings: Settings) -> bool:
    host = websocket.client.host if websocket.client else ""
    return settings.app_env.casefold() in {"development", "test"} and host in {
        "127.0.0.1",
        "::1",
        "testclient",
    }


def _is_authorized(websocket: WebSocket, settings: Settings) -> bool:
    if _is_local_client(websocket, settings):
        return True
    received = websocket.headers.get("x-internal-api-key", "")
    return bool(received) and secrets.compare_digest(
        received, settings.internal_api_key
    )


def _origin_is_allowed(websocket: WebSocket, settings: Settings) -> bool:
    origin = websocket.headers.get("origin", "").rstrip("/")
    if _is_local_client(websocket, settings):
        return origin in {
            "http://127.0.0.1:5173",
            "http://localhost:5173",
            "http://127.0.0.1:8000",
            "http://localhost:8000",
            "",
        }
    return origin in settings.cors_allowed_origins


@router.get("/status", include_in_schema=False)
async def voice_status(request: Request) -> dict[str, object]:
    settings = get_settings()
    available = isinstance(
        getattr(request.app.state, "voice_service", None), VoicePipelineService
    )
    return {
        "enabled": settings.voice_enabled,
        "available": available,
        "transport": "websocket",
        "stt_provider": (
            "mock" if settings.voice_enabled and settings.voice_mock_enabled else "local"
        ),
        "tts_provider": (
            "mock" if settings.voice_enabled and settings.voice_mock_enabled else "local"
        ),
        "raw_audio_external": False,
        "audio_persistence": False,
        "max_parallel_turns": settings.voice_turn_max_concurrency,
        "queue_timeout_ms": round(settings.voice_queue_timeout_seconds * 1000),
        "max_audio_bytes": settings.voice_max_audio_bytes,
        "max_seconds": settings.voice_max_seconds,
    }


@router.websocket("/ws")
async def voice_websocket(websocket: WebSocket) -> None:
    settings = get_settings()
    service = getattr(websocket.app.state, "voice_service", None)
    if (
        not settings.voice_enabled
        or not isinstance(service, VoicePipelineService)
        or not _is_authorized(websocket, settings)
        or not _origin_is_allowed(websocket, settings)
    ):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    audio = bytearray()
    mime_type: str | None = None
    turn_started: float | None = None
    try:
        await websocket.send_json(
            {
                "type": "ready",
                "max_audio_bytes": settings.voice_max_audio_bytes,
                "max_seconds": settings.voice_max_seconds,
            }
        )
        while True:
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                break

            binary = message.get("bytes")
            if binary is not None:
                if mime_type is None or turn_started is None:
                    await websocket.send_json(
                        {"type": "error", "code": "turn_not_started"}
                    )
                    continue
                if monotonic() - turn_started > settings.voice_max_seconds:
                    zeroize(audio)
                    mime_type = None
                    turn_started = None
                    await websocket.send_json(
                        {"type": "error", "code": "duration_limit"}
                    )
                    continue
                if len(audio) + len(binary) > settings.voice_max_audio_bytes:
                    zeroize(audio)
                    mime_type = None
                    turn_started = None
                    await websocket.send_json(
                        {"type": "error", "code": "size_limit"}
                    )
                    continue
                # Starlette fornece bytes imutáveis. A cópia mutável é zerada
                # logo após ser consolidada no buffer limitado do turno.
                chunk = bytearray(binary)
                try:
                    audio.extend(chunk)
                finally:
                    zeroize(chunk)
                    del binary
                continue

            text = message.get("text")
            if text is None:
                continue
            try:
                payload = json.loads(text)
                message_type = payload.get("type") if isinstance(payload, dict) else None
                if message_type == "start":
                    start = VoiceStart.model_validate(payload)
                    zeroize(audio)
                    mime_type = start.mime_type
                    turn_started = monotonic()
                    await websocket.send_json({"type": "listening"})
                    continue
                command = VoiceCommand.model_validate(payload)
            except (json.JSONDecodeError, ValidationError, AttributeError):
                await websocket.send_json(
                    {"type": "error", "code": "invalid_control_message"}
                )
                continue

            if command.type == "cancel":
                zeroize(audio)
                mime_type = None
                turn_started = None
                await websocket.send_json({"type": "cancelled"})
                continue

            if not audio or mime_type is None:
                await websocket.send_json({"type": "error", "code": "empty_audio"})
                continue

            await websocket.send_json({"type": "processing"})
            result = None
            try:
                result = await service.process(audio, mime_type)
                await websocket.send_json(
                    {
                        "type": "result",
                        "transcript": result.transcript,
                        "answer": result.answer,
                        "latency_ms": {
                            "stt": result.metrics.stt_ms,
                            "query": result.metrics.query_ms,
                            "llm": result.metrics.llm_ms,
                            "tts": result.metrics.tts_ms,
                        },
                    }
                )
                await websocket.send_json(
                    {
                        "type": "audio_start",
                        "mime_type": "audio/wav",
                        "bytes": len(result.audio_wav),
                    }
                )
                for offset in range(0, len(result.audio_wav), 64 * 1024):
                    await websocket.send_bytes(
                        bytes(result.audio_wav[offset : offset + 64 * 1024])
                    )
                await websocket.send_json({"type": "audio_end"})
                logger.info(
                    "voice_turn_completed stt_ms=%d query_ms=%d llm_ms=%d tts_ms=%d",
                    result.metrics.stt_ms,
                    result.metrics.query_ms,
                    result.metrics.llm_ms,
                    result.metrics.tts_ms,
                )
            except VoiceCapacityExceeded:
                logger.info("voice_turn_rejected reason=capacity")
                await websocket.send_json(
                    {"type": "error", "code": "voice_busy", "retryable": True}
                )
            except VoiceProviderError:
                logger.warning("voice_turn_failed reason=provider")
                await websocket.send_json(
                    {
                        "type": "error",
                        "code": "voice_provider_unavailable",
                        "retryable": False,
                    }
                )
            except Exception:
                logger.exception("voice_turn_failed reason=internal")
                await websocket.send_json(
                    {"type": "error", "code": "voice_processing_failed"}
                )
            finally:
                release_ephemeral_memory(audio)
                mime_type = None
                turn_started = None
                if result is not None:
                    release_ephemeral_memory(result.audio_wav)
                    result = None
    except WebSocketDisconnect:
        pass
    finally:
        release_ephemeral_memory(audio)
