from __future__ import annotations

import unittest
from pathlib import Path
from types import SimpleNamespace

from app.voice.providers import LocalSpeechToTextProvider, PiperTTSProvider
from app.voice.security import zeroize


ROOT = Path(__file__).resolve().parents[1]
STT_MODEL = ROOT / "models" / "faster-whisper-base"
TTS_MODEL = ROOT / "models" / "pt_BR-faber-medium.onnx"
TTS_CONFIG = ROOT / "models" / "pt_BR-faber-medium.onnx.json"


@unittest.skipUnless(
    STT_MODEL.is_dir() and TTS_MODEL.is_file() and TTS_CONFIG.is_file(),
    "modelos locais de voz nao instalados",
)
class LocalVoiceRuntimeTest(unittest.IsolatedAsyncioTestCase):
    async def test_tts_para_stt_permanece_em_memoria(self) -> None:
        settings = SimpleNamespace(
            voice_stt_model_path=str(STT_MODEL),
            voice_stt_max_concurrency=1,
            voice_stt_device="cpu",
            voice_stt_compute_type="int8",
            voice_stt_cpu_threads=2,
            voice_stt_language="pt",
            voice_max_seconds=60,
            voice_tts_model_path=str(TTS_MODEL),
            voice_tts_config_path=str(TTS_CONFIG),
            voice_tts_max_characters=1_500,
        )
        stt = LocalSpeechToTextProvider(settings)
        tts = PiperTTSProvider(settings)
        audio = bytearray()
        try:
            await stt.load()
            await tts.load()
            audio = await tts.synthesize("Quantos pacientes existem?")
            self.assertEqual(bytes(audio[:4]), b"RIFF")
            transcript = await stt.transcribe(audio, "audio/webm")
            self.assertIn("pacientes", transcript.casefold())
        finally:
            zeroize(audio)
            await tts.close()
            await stt.close()


if __name__ == "__main__":
    unittest.main()
