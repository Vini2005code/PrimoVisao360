from __future__ import annotations

import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch


os.environ["GROQ_API_KEY"] = "gsk_test_only_000000000000000000000000"
os.environ["INTERNAL_API_KEY"] = "internal-test-key-0000000000000000"
os.environ["APP_ENV"] = "test"
os.environ["ENABLE_DOCS"] = "true"
os.environ["CORS_ALLOWED_ORIGINS"] = ""
os.environ["DATABASE_ENABLED"] = "false"

import httpx  # noqa: E402

from app.dependencies import (  # noqa: E402
    get_chat_service,
    get_vision_service,
)
from app.chat.repository import validate_read_only_sql  # noqa: E402
from app.chat.schemas import ChatAnswer  # noqa: E402
from app.chat.service import classify_question  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas import Visao360Saida  # noqa: E402
from app.core.config import Settings  # noqa: E402
from app.schemas import Visao360Entrada  # noqa: E402
from app.services.groq_service import (  # noqa: E402
    GroqVisionService,
    TokenUsage,
    VisionGeneration,
)
from app.voice.providers import VoicePipelineService  # noqa: E402
from app.voice.security import PseudonymizationSession, zeroize  # noqa: E402


VALID_PAYLOAD = {
    "clinic_id": "550e8400-e29b-41d4-a716-446655440000",
    "lgpd_nivel": "pseudonimizado",
    "paciente": {
        "idade": 42,
        "sexo": "M",
        "status": "ativo",
        "diagnosticos": [
            {
                "codigo": "I10",
                "descricao": "Hipertensão arterial sistêmica",
                "status": "ativo",
                "diagnosticado_em": "2024-01-10",
            }
        ],
    },
    "exames": [
        {
            "tipo": "Hemograma",
            "resultado_texto": "Hemoglobina 14,2 g/dL; leucócitos 7.100/mm³.",
            "processado_em": "2024-03-15",
        }
    ],
    "sinais_vitais": [],
    "alergias": [],
    "evolucoes": [
        {
            "texto": "Evolução estável, sem intercorrências registradas.",
            "registrada_em": "2024-03-15",
            "tipo": "ambulatorial",
        }
    ],
}


class FakeVisionService:
    async def generate(self, payload):  # noqa: ANN001
        return VisionGeneration(
            insights=Visao360Saida(
                resumo_executivo="Paciente adulto em acompanhamento clínico.",
                alertas_criticos=[],
                tendencias=[],
                status_processamento="sucesso",
            ),
            usage=TokenUsage(
                prompt_tokens=321,
                completion_tokens=87,
                total_tokens=408,
            ),
            provider_latency_ms=125,
            model="openai/gpt-oss-20b",
        )


def override_service() -> FakeVisionService:
    return FakeVisionService()


class FakeChatService:
    async def answer(self, question):  # noqa: ANN001
        _ = question
        return ChatAnswer(
            tipo="total_pacientes",
            mensagem="Existem 70 pacientes cadastrados.",
            dados=[{"total_pacientes": 70}],
        )


def override_chat_service() -> FakeChatService:
    return FakeChatService()


class FakeGroqCompletions:
    def __init__(self) -> None:
        self.arguments = None

    async def create(self, **kwargs):  # noqa: ANN003, ANN201
        self.arguments = kwargs
        content = Visao360Saida(
            resumo_executivo="Resumo estritamente clínico.",
            alertas_criticos=[],
            tendencias=[],
            status_processamento="sucesso",
        ).model_dump_json()
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=content))],
            usage=SimpleNamespace(
                prompt_tokens=100,
                completion_tokens=40,
                total_tokens=140,
            ),
        )


class FakeGroqClient:
    def __init__(self) -> None:
        self.completions = FakeGroqCompletions()
        self.chat = SimpleNamespace(completions=self.completions)

    async def close(self) -> None:
        return None


class DatabaseConfigTest(unittest.TestCase):
    def test_rejeita_identificador_sql_injetavel(self) -> None:
        with patch.dict(
            os.environ,
            {
                "DATABASE_ENABLED": "true",
                "DATABASE_URL": "postgresql://readonly:secret@localhost/prontuario",
                "DB_SCHEMA": "ehr_teste;DROP_SCHEMA",
            },
        ):
            with self.assertRaisesRegex(RuntimeError, "DB_SCHEMA"):
                Settings.from_env()

    def test_rejeita_banco_remoto_sem_tls_em_producao(self) -> None:
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "DATABASE_ENABLED": "true",
                "DATABASE_URL": "postgresql://readonly:secret@db.example/prontuario",
            },
        ):
            with self.assertRaisesRegex(RuntimeError, "sslmode"):
                Settings.from_env()

    def test_database_url_nao_aparece_na_representacao(self) -> None:
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "test",
                "DATABASE_ENABLED": "true",
                "DATABASE_URL": "postgresql://readonly:segredo@localhost/prontuario",
                "DB_SCHEMA": "ehr_teste",
            },
        ):
            settings = Settings.from_env()
        self.assertNotIn("segredo", repr(settings))

    def test_rejeita_origem_http_remota_em_producao(self) -> None:
        with patch.dict(
            os.environ,
            {
                "APP_ENV": "production",
                "DATABASE_ENABLED": "false",
                "CORS_ALLOWED_ORIGINS": "http://prontuario.example",
            },
        ):
            with self.assertRaisesRegex(RuntimeError, "HTTPS"):
                Settings.from_env()


class ControlledChatTest(unittest.TestCase):
    def test_classifica_as_seis_perguntas_cadastradas(self) -> None:
        questions = {
            "Quantos pacientes existem?": "total_pacientes",
            "Quais pacientes têm doenças raras?": "doencas_raras",
            "Quais pacientes têm diabetes e usam insulina?": "diabetes_insulina",
            "Quais medicamentos estão em uso?": "medicamentos_em_uso",
            "Quais pacientes usam suplementos?": "suplementos",
            "Quais pacientes têm maior risco cardiometabólico?": "risco_cardiometabolico",
        }
        for question, expected in questions.items():
            with self.subTest(question=question):
                query = classify_question(question)
                self.assertIsNotNone(query)
                self.assertEqual(query.kind, expected)

    def test_bloqueia_sql_destrutivo(self) -> None:
        with self.assertRaisesRegex(Exception, "nao permitido"):
            validate_read_only_sql("SELECT 1; DROP TABLE paciente")

    def test_aceita_somente_select_ou_with(self) -> None:
        self.assertEqual(validate_read_only_sql("SELECT 1"), "SELECT 1")
        with self.assertRaisesRegex(Exception, "SELECT ou WITH"):
            validate_read_only_sql("VACUUM paciente")


class VoiceSecurityTest(unittest.TestCase):
    def test_pseudonimiza_e_reidentifica_apenas_no_cofre_efemero(self) -> None:
        session = PseudonymizationSession(
            [("PACIENTE", "Joao Fonseca")]
        )
        safe = session.pseudonymize_text(
            "Joao Fonseca, CPF 123.456.789-09, email joao@example.com"
        )
        self.assertNotIn("Joao Fonseca", safe)
        self.assertNotIn("123.456.789-09", safe)
        self.assertNotIn("joao@example.com", safe)
        self.assertIn("[PACIENTE_", safe)
        self.assertIn("Joao Fonseca", session.reidentify_text(safe))
        session.clear()
        self.assertEqual(session.reidentify_text(safe), safe)

    def test_mascara_nome_completo_nao_cadastrado_de_forma_conservadora(self) -> None:
        session = PseudonymizationSession()
        safe = session.pseudonymize_text(
            "Mostre os registros de Maria Oliveira neste periodo."
        )
        self.assertNotIn("Maria Oliveira", safe)
        self.assertIn("[PESSOA_", safe)

    def test_sobrescreve_e_limpa_buffer_mutavel(self) -> None:
        audio = bytearray(b"patient-audio")
        zeroize(audio)
        self.assertEqual(audio, bytearray())

    def test_voice_fail_fast_sem_modelo_stt_local(self) -> None:
        with patch.dict(
            os.environ,
            {
                "VOICE_ENABLED": "true",
                "VOICE_STT_MODEL_PATH": "",
                "VOICE_TTS_MODEL_PATH": "models/voice.onnx",
                "VOICE_TTS_CONFIG_PATH": "models/voice.onnx.json",
            },
        ):
            with self.assertRaisesRegex(RuntimeError, "VOICE_STT_MODEL_PATH"):
                Settings.from_env()


class FakeVoiceChat:
    async def find_sensitive_values(self, text):  # noqa: ANN001, ANN201
        self.seen_text = text
        return [("PACIENTE", "Joao Fonseca")]

    async def answer(self, question):  # noqa: ANN001, ANN201
        return ChatAnswer(
            tipo="medicamentos_em_uso",
            mensagem="Encontrei um registro.",
            dados=[{"nome_completo": "Joao Fonseca", "medicamento": "Teste"}],
        )


class FakeLocalSTT:
    async def transcribe(self, audio, mime_type):  # noqa: ANN001, ANN201
        self.mime_type = mime_type
        self.audio_size = len(audio)
        return "Quais medicamentos Joao Fonseca usa?"

    async def close(self) -> None:
        return None


class FakeVoiceGroq:
    def __init__(self) -> None:
        self.safe_question = ""
        self.safe_answer = ""

    async def verbalize(self, question, answer, pseudonymizer):  # noqa: ANN001, ANN201
        self.safe_question = pseudonymizer.pseudonymize_text(question)
        self.safe_answer = str(
            pseudonymizer.pseudonymize_value(answer.model_dump(mode="json"))
        )
        return pseudonymizer.reidentify_text(
            "Joao Fonseca possui um registro de medicamento."
        )

    async def close(self) -> None:
        return None


class FakeVoiceTTS:
    async def synthesize(self, text):  # noqa: ANN001, ANN201
        self.text = text
        return bytearray(b"RIFF-test-wave")

    async def close(self) -> None:
        return None


class VoicePipelineTest(unittest.IsolatedAsyncioTestCase):
    async def test_audio_e_limpo_e_pii_nao_chega_a_verbalizacao(self) -> None:
        settings = Settings(
            app_env="test",
            cors_allowed_origins=(),
            docs_enabled=True,
            groq_api_key=os.environ["GROQ_API_KEY"],
            groq_max_completion_tokens=1200,
            groq_max_retries=0,
            groq_model="openai/gpt-oss-20b",
            groq_timeout_seconds=5,
            internal_api_key=os.environ["INTERNAL_API_KEY"],
            log_level="INFO",
        )
        groq = FakeVoiceGroq()
        service = VoicePipelineService(
            settings,
            FakeVoiceChat(),
            FakeLocalSTT(),
            groq,
            FakeVoiceTTS(),
        )
        audio = bytearray(b"temporary-audio")
        result = await service.process(audio, "audio/webm")
        self.assertEqual(audio, bytearray())
        self.assertNotIn("Joao Fonseca", groq.safe_question)
        self.assertNotIn("Joao Fonseca", groq.safe_answer)
        self.assertEqual(result.audio_wav[:4], b"RIFF")


class VisionApiTest(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls) -> None:
        app.dependency_overrides[get_vision_service] = override_service
        app.dependency_overrides[get_chat_service] = override_chat_service

    @classmethod
    def tearDownClass(cls) -> None:
        app.dependency_overrides.clear()

    async def asyncSetUp(self) -> None:
        self.lifespan = app.router.lifespan_context(app)
        await self.lifespan.__aenter__()
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        await self.lifespan.__aexit__(None, None, None)

    async def test_openapi_expoe_contrato_e_seguranca(self) -> None:
        schema = (await self.client.get("/openapi.json")).json()
        operation = schema["paths"]["/ai/gerar-visao-360"]["post"]
        self.assertEqual(operation["security"], [{"BackendJavaApiKey": []}])

    async def test_requisicao_valida_retorna_insights_e_metricas(self) -> None:
        response = await self.client.post(
            "/ai/gerar-visao-360",
            json=VALID_PAYLOAD,
            headers={"X-Internal-API-Key": os.environ["INTERNAL_API_KEY"]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status_processamento"], "sucesso")
        self.assertEqual(response.headers["X-Groq-Total-Tokens"], "408")
        self.assertIn("groq;dur=125", response.headers["Server-Timing"])
        self.assertIn("X-Request-ID", response.headers)

    async def test_credencial_ausente_e_rejeitada(self) -> None:
        response = await self.client.post(
            "/ai/gerar-visao-360",
            json=VALID_PAYLOAD,
        )
        self.assertEqual(response.status_code, 401)

    async def test_pii_e_rejeitada_sem_ecoar_valor(self) -> None:
        payload = {
            **VALID_PAYLOAD,
            "evolucoes": [
                {
                    "texto": "Contato: pessoa.identificavel@example.com",
                    "registrada_em": "2024-03-15",
                    "tipo": "ambulatorial",
                }
            ],
        }
        response = await self.client.post(
            "/ai/gerar-visao-360",
            json=payload,
            headers={"X-Internal-API-Key": os.environ["INTERNAL_API_KEY"]},
        )
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("pessoa.identificavel@example.com", response.text)
        self.assertIn("LGPD", response.text)

    async def test_healthcheck(self) -> None:
        response = await self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    async def test_voice_status_declara_audio_nao_persistente(self) -> None:
        response = await self.client.get("/voice/status")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "enabled": False,
                "available": False,
                "transport": "websocket",
                "stt_provider": "local",
                "tts_provider": "local",
                "raw_audio_external": False,
                "audio_persistence": False,
            },
        )

    async def test_chat_retorna_contrato_do_banco(self) -> None:
        response = await self.client.post(
            "/chat",
            json={"pergunta": "Quantos pacientes existem?"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "pergunta": "Quantos pacientes existem?",
                "resposta": {
                    "tipo": "total_pacientes",
                    "mensagem": "Existem 70 pacientes cadastrados.",
                    "dados": [{"total_pacientes": 70}],
                    "sugestoes": [],
                },
            },
        )

    async def test_raiz_abre_a_interface_sem_404(self) -> None:
        response = await self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Primordial DATA", response.text)
        self.assertIn("Chat", response.text)

    async def test_favicon_nao_retorna_404(self) -> None:
        response = await self.client.get("/favicon.ico")
        self.assertEqual(response.status_code, 204)

    async def test_interface_python_e_incorporavel_no_mesmo_dominio(self) -> None:
        response = await self.client.get("/primordial-data")
        self.assertEqual(response.status_code, 200)
        self.assertIn("Primordial DATA", response.text)
        self.assertIn("Chat", response.text)
        self.assertIn("Salvamentos", response.text)
        self.assertNotIn("clinic_id", response.text)
        self.assertNotIn("patient_id", response.text)
        self.assertEqual(response.headers["X-Frame-Options"], "SAMEORIGIN")
        self.assertIn("frame-ancestors 'self'", response.headers["Content-Security-Policy"])
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    async def test_assets_locais_nao_dependem_de_cdn(self) -> None:
        css = await self.client.get(
            "/static/primordial-data/css/primordial-data.css"
        )
        chart = await self.client.get(
            "/static/primordial-data/vendor/chart.umd.min.js"
        )
        self.assertEqual(css.status_code, 200)
        self.assertEqual(chart.status_code, 200)
        self.assertGreater(len(chart.content), 100_000)

    async def test_bootstrap_demonstrativo_foi_removido(self) -> None:
        response = await self.client.get("/primordial-data/bootstrap")
        self.assertEqual(response.status_code, 404)

    async def test_prompt_exclui_metadados_internos_e_usa_schema_estrito(
        self,
    ) -> None:
        settings = Settings(
            app_env="test",
            cors_allowed_origins=(),
            docs_enabled=True,
            groq_api_key=os.environ["GROQ_API_KEY"],
            groq_max_completion_tokens=1200,
            groq_max_retries=0,
            groq_model="openai/gpt-oss-20b",
            groq_timeout_seconds=5,
            internal_api_key=os.environ["INTERNAL_API_KEY"],
            log_level="INFO",
        )
        service = object.__new__(GroqVisionService)
        service._settings = settings
        service._client = FakeGroqClient()

        result = await service.generate(
            Visao360Entrada.model_validate(VALID_PAYLOAD)
        )
        arguments = service._client.completions.arguments
        self.assertIsNotNone(arguments)
        user_content = arguments["messages"][1]["content"]
        self.assertNotIn(VALID_PAYLOAD["clinic_id"], user_content)
        self.assertNotIn("lgpd_nivel", user_content)
        self.assertTrue(arguments["response_format"]["json_schema"]["strict"])
        self.assertEqual(result.usage.total_tokens, 140)


if __name__ == "__main__":
    unittest.main()
