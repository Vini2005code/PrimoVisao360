"""Provedores de STT, LLM e TTS sem persistencia de audio."""

from __future__ import annotations

import asyncio
import gc
import io
import json
import wave
from dataclasses import dataclass
from pathlib import Path
from time import perf_counter
from typing import Any

from groq import APIConnectionError, APIStatusError, APITimeoutError, AsyncGroq
from pydantic import ValidationError

from app.chat.schemas import ChatAnswer
from app.core.config import Settings
from app.voice.schemas import VoiceInsight
from app.voice.security import (
    PseudonymizationSession,
    release_ephemeral_memory,
    zeroize,
)


class VoiceProviderError(RuntimeError):
    """Falha segura em um provedor do pipeline de voz."""


class VoiceCapacityExceeded(VoiceProviderError):
    """O limite de turnos simultâneos foi atingido."""


@dataclass(frozen=True, slots=True)
class VoiceTurnMetrics:
    stt_ms: int
    query_ms: int
    llm_ms: int
    tts_ms: int


@dataclass(slots=True)
class VoiceTurnResult:
    transcript: str
    answer: str
    audio_wav: bytearray
    metrics: VoiceTurnMetrics


_VOICE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "mensagem": {"type": "string"},
        "status_processamento": {"type": "string", "enum": ["sucesso"]},
    },
    "required": ["mensagem", "status_processamento"],
    "additionalProperties": False,
}

_VOICE_SYSTEM_PROMPT = """
Voce e a camada de verbalizacao factual do Primordial DATA.
Use exclusivamente o CONTEXTO_AUTORIZADO recebido.
Nao diagnostique, nao prescreva e nao sugira conduta.
Nao complete lacunas e nao use conhecimento externo.
Preserve literalmente tokens como [PACIENTE_0001] e [CPF_0002].
Produza uma resposta curta, natural para fala e em portugues brasileiro.
Se o contexto disser que a consulta nao e suportada, informe isso objetivamente.
""".strip()


class LocalSpeechToTextProvider:
    """Whisper local: decodifica e transcreve sem abrir conexao de rede."""

    _REQUIRED_MODEL_FILES = ("config.json", "model.bin", "tokenizer.json")

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model: Any | None = None
        self._semaphore = asyncio.Semaphore(settings.voice_stt_max_concurrency)

    async def load(self) -> None:
        model_path = Path(self._settings.voice_stt_model_path).resolve()
        if not model_path.is_dir() or any(
            not (model_path / name).is_file()
            for name in self._REQUIRED_MODEL_FILES
        ):
            raise VoiceProviderError("Modelo STT local incompleto ou nao encontrado.")
        try:
            from faster_whisper import WhisperModel

            self._model = await asyncio.to_thread(
                WhisperModel,
                str(model_path),
                device=self._settings.voice_stt_device,
                compute_type=self._settings.voice_stt_compute_type,
                cpu_threads=self._settings.voice_stt_cpu_threads,
                num_workers=self._settings.voice_stt_max_concurrency,
                local_files_only=True,
            )
        except Exception:
            raise VoiceProviderError(
                "Nao foi possivel carregar o modelo STT local."
            ) from None

    async def transcribe(self, audio: bytearray, mime_type: str) -> str:
        if self._model is None:
            raise VoiceProviderError("STT local indisponivel.")
        if mime_type not in {
            "audio/webm",
            "audio/webm;codecs=opus",
            "audio/ogg",
            "audio/ogg;codecs=opus",
        }:
            raise VoiceProviderError("Formato de audio nao permitido.")

        async with self._semaphore:
            return await asyncio.to_thread(self._transcribe_sync, audio)

    def _transcribe_sync(self, audio: bytearray) -> str:
        from faster_whisper.audio import decode_audio

        encoded = io.BytesIO(audio)
        samples: Any | None = None
        try:
            # PyAV decodifica WebM/Ogg diretamente da RAM para PCM mono 16 kHz.
            samples = decode_audio(encoded, sampling_rate=16_000)
            duration_seconds = len(samples) / 16_000
            if duration_seconds < 0.15:
                raise VoiceProviderError("Audio curto demais para transcricao.")
            if duration_seconds > self._settings.voice_max_seconds + 1:
                raise VoiceProviderError("Audio excedeu o limite de duracao.")

            segments, _ = self._model.transcribe(
                samples,
                language=self._settings.voice_stt_language,
                task="transcribe",
                beam_size=1,
                best_of=1,
                temperature=0.0,
                condition_on_previous_text=False,
                without_timestamps=True,
                vad_filter=True,
                vad_parameters={"min_silence_duration_ms": 300},
            )
            text = " ".join(
                segment.text.strip() for segment in segments if segment.text.strip()
            ).strip()
        except VoiceProviderError:
            raise
        except Exception:
            raise VoiceProviderError(
                "Falha na decodificacao ou transcricao local."
            ) from None
        finally:
            if samples is not None:
                samples.fill(0)
                del samples
            if not encoded.closed:
                view = encoded.getbuffer()
                try:
                    view[:] = b"\x00" * len(view)
                finally:
                    view.release()
                    encoded.close()
            # Arrays PCM e buffers do PyAV/NumPy usam memória nativa. Remover
            # as referências aqui evita que sobrevivam ao retorno do STT.
            gc.collect(0)

        if not text or len(text) > 4_000:
            raise VoiceProviderError("A transcricao local e invalida.")
        return text

    async def close(self) -> None:
        self._model = None


class GroqInsightProvider:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = AsyncGroq(
            api_key=settings.groq_api_key,
            max_retries=settings.groq_max_retries,
            timeout=settings.groq_timeout_seconds,
        )

    async def close(self) -> None:
        await self._client.close()

    async def verbalize(
        self,
        question: str,
        answer: ChatAnswer,
        pseudonymizer: PseudonymizationSession,
    ) -> str:
        safe_question = pseudonymizer.pseudonymize_text(question)
        answer_data = answer.model_dump(mode="json")
        # Voz resume o conjunto; no maximo vinte linhas cruzam a fronteira do LLM.
        answer_data["dados"] = answer_data.get("dados", [])[:20]
        safe_answer = pseudonymizer.pseudonymize_value(answer_data)
        prompt = json.dumps(
            {
                "pergunta_pseudonimizada": safe_question,
                "contexto_autorizado": safe_answer,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        try:
            completion = await self._client.chat.completions.create(
                model=self._settings.groq_model,
                messages=[
                    {"role": "system", "content": _VOICE_SYSTEM_PROMPT},
                    {"role": "user", "content": "CONTEXTO_AUTORIZADO\n" + prompt},
                ],
                include_reasoning=False,
                max_completion_tokens=min(
                    self._settings.groq_max_completion_tokens, 700
                ),
                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name": "primordial_voice_answer",
                        "strict": True,
                        "schema": _VOICE_JSON_SCHEMA,
                    },
                },
                seed=42,
                temperature=0.0,
            )
        except (APITimeoutError, APIConnectionError, APIStatusError):
            raise VoiceProviderError("Falha na verbalizacao clinica.") from None

        content = completion.choices[0].message.content if completion.choices else None
        try:
            insight = VoiceInsight.model_validate_json(content or "")
        except (ValidationError, ValueError):
            raise VoiceProviderError("Resposta de voz fora do contrato.") from None
        return pseudonymizer.reidentify_text(insight.mensagem)


class PiperTTSProvider:
    """Sintetiza WAV em RAM; o modelo ONNX e o unico artefato persistente."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._voice: Any | None = None
        self._lock = asyncio.Lock()

    async def load(self) -> None:
        model_path = Path(self._settings.voice_tts_model_path).resolve()
        config_path = Path(self._settings.voice_tts_config_path).resolve()
        if not model_path.is_file() or not config_path.is_file():
            raise VoiceProviderError("Modelo TTS local nao encontrado.")
        try:
            from piper import PiperVoice

            self._voice = await asyncio.to_thread(
                PiperVoice.load,
                str(model_path),
                config_path=str(config_path),
            )
        except Exception:
            raise VoiceProviderError("Nao foi possivel carregar o TTS local.") from None

    async def synthesize(self, text: str) -> bytearray:
        if self._voice is None:
            raise VoiceProviderError("TTS local indisponivel.")
        safe_text = text[: self._settings.voice_tts_max_characters]

        def render() -> bytearray:
            memory = io.BytesIO()
            try:
                with wave.open(memory, "wb") as wav_file:
                    self._voice.synthesize_wav(safe_text, wav_file)
                return bytearray(memory.getvalue())
            finally:
                memory.close()

        async with self._lock:
            return await asyncio.to_thread(render)

    async def close(self) -> None:
        self._voice = None


def collect_known_identifiers(answer: ChatAnswer) -> list[tuple[str, str]]:
    categories = {
        "nome_completo": "PACIENTE",
        "cpf": "CPF",
        "cns": "CNS",
        "email": "EMAIL",
        "telefone": "TELEFONE",
    }
    values: list[tuple[str, str]] = []
    for row in answer.dados:
        for key, category in categories.items():
            value = row.get(key)
            if isinstance(value, str) and value.strip():
                values.append((category, value))
    return values


class VoicePipelineService:
    def __init__(
        self,
        settings: Settings,
        chat_service: Any,
        stt_provider: LocalSpeechToTextProvider,
        groq_provider: GroqInsightProvider,
        tts_provider: PiperTTSProvider,
    ) -> None:
        self._settings = settings
        self._chat_service = chat_service
        self._stt = stt_provider
        self._groq = groq_provider
        self._tts = tts_provider
        self._turn_semaphore = asyncio.Semaphore(
            settings.voice_turn_max_concurrency
        )

    @classmethod
    async def create(cls, settings: Settings, chat_service: Any) -> "VoicePipelineService":
        stt = LocalSpeechToTextProvider(settings)
        groq = GroqInsightProvider(settings)
        tts = PiperTTSProvider(settings)
        try:
            await stt.load()
            await tts.load()
        except Exception:
            await stt.close()
            await groq.close()
            raise
        return cls(settings, chat_service, stt, groq, tts)

    async def process(self, audio: bytearray, mime_type: str) -> VoiceTurnResult:
        acquired = False
        try:
            await asyncio.wait_for(
                self._turn_semaphore.acquire(),
                timeout=self._settings.voice_queue_timeout_seconds,
            )
            acquired = True
            return await self._process_turn(audio, mime_type)
        except TimeoutError:
            release_ephemeral_memory(audio)
            raise VoiceCapacityExceeded(
                "Capacidade de voz ocupada; tente novamente."
            ) from None
        finally:
            if acquired:
                self._turn_semaphore.release()

    async def _process_turn(
        self, audio: bytearray, mime_type: str
    ) -> VoiceTurnResult:
        pseudonymizer: PseudonymizationSession | None = None
        output_audio = bytearray()
        try:
            started = perf_counter()
            transcript = await self._stt.transcribe(audio, mime_type)
            stt_ms = round((perf_counter() - started) * 1000)
            # O buffer de voz deixa de existir assim que a transcricao termina.
            release_ephemeral_memory(audio)

            query_started = perf_counter()
            identifiers = await self._chat_service.find_sensitive_values(transcript)
            answer = await self._chat_service.answer(transcript)
            query_ms = round((perf_counter() - query_started) * 1000)

            pseudonymizer = PseudonymizationSession(
                [*identifiers, *collect_known_identifiers(answer)]
            )
            llm_started = perf_counter()
            spoken_answer = await self._groq.verbalize(
                transcript, answer, pseudonymizer
            )
            llm_ms = round((perf_counter() - llm_started) * 1000)

            tts_started = perf_counter()
            output_audio = await self._tts.synthesize(spoken_answer)
            tts_ms = round((perf_counter() - tts_started) * 1000)
            return VoiceTurnResult(
                transcript=transcript,
                answer=spoken_answer,
                audio_wav=output_audio,
                metrics=VoiceTurnMetrics(
                    stt_ms=stt_ms,
                    query_ms=query_ms,
                    llm_ms=llm_ms,
                    tts_ms=tts_ms,
                ),
            )
        except Exception:
            release_ephemeral_memory(audio, output_audio)
            raise
        finally:
            if pseudonymizer is not None:
                pseudonymizer.clear()

    async def close(self) -> None:
        await self._tts.close()
        await self._stt.close()
        await self._groq.close()


class MockVoicePipelineService(VoicePipelineService):
    """Mock localhost que nao decodifica, persiste ou envia audio."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def process(self, audio: bytearray, mime_type: str) -> VoiceTurnResult:
        del mime_type
        release_ephemeral_memory(audio)
        transcript = "Transcricao simulada do modo de voz local."
        answer = (
            "O modo de voz esta em desenvolvimento. Use o campo de texto "
            "para consultar os dados clinicos neste MVP."
        )
        memory = io.BytesIO()
        try:
            with wave.open(memory, "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(16_000)
                wav_file.writeframes(b"\x00\x00" * 1_600)
            audio_wav = bytearray(memory.getvalue())
        finally:
            memory.close()
        return VoiceTurnResult(
            transcript=transcript,
            answer=answer,
            audio_wav=audio_wav,
            metrics=VoiceTurnMetrics(stt_ms=0, query_ms=0, llm_ms=0, tts_ms=0),
        )

    async def close(self) -> None:
        return None
