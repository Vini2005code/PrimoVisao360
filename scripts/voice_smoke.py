"""Smoke test sem microfone e sem dados pessoais para o WebSocket de voz."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from types import SimpleNamespace

from websockets.asyncio.client import connect

from app.voice.providers import PiperTTSProvider
from app.voice.security import zeroize


ROOT = Path(__file__).resolve().parents[1]


async def main() -> None:
    settings = SimpleNamespace(
        voice_tts_model_path=str(ROOT / "models" / "pt_BR-faber-medium.onnx"),
        voice_tts_config_path=str(
            ROOT / "models" / "pt_BR-faber-medium.onnx.json"
        ),
        voice_tts_max_characters=1_500,
    )
    tts = PiperTTSProvider(settings)
    request_audio = bytearray()
    response_audio = bytearray()
    message_types: list[str] = []
    try:
        await tts.load()
        request_audio = await tts.synthesize("Quantos pacientes existem?")
        async with connect(
            "ws://127.0.0.1:8000/voice/ws",
            origin="http://127.0.0.1:5173",
            max_size=12_000_000,
        ) as websocket:
            ready = json.loads(await websocket.recv())
            message_types.append(ready["type"])
            await websocket.send(
                json.dumps(
                    {
                        "type": "start",
                        # O decodificador identifica o container pelos bytes.
                        "mime_type": "audio/webm",
                        "clinic_id": None,
                        "patient_id": None,
                    }
                )
            )
            await websocket.send(bytes(request_audio))
            await websocket.send(json.dumps({"type": "commit"}))

            while True:
                message = await websocket.recv()
                if isinstance(message, bytes):
                    response_audio.extend(message)
                    continue
                payload = json.loads(message)
                message_types.append(payload["type"])
                if payload["type"] == "error":
                    raise RuntimeError(payload["code"])
                if payload["type"] == "audio_end":
                    break

        if bytes(response_audio[:4]) != b"RIFF":
            raise RuntimeError("O servidor nao retornou um WAV valido.")
        print("pipeline=ok")
        print("messages=" + ",".join(message_types))
        print(f"response_audio_bytes={len(response_audio)}")
    finally:
        zeroize(request_audio)
        zeroize(response_audio)
        await tts.close()


if __name__ == "__main__":
    asyncio.run(main())
