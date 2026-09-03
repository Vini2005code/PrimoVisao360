from __future__ import annotations

import os
import unittest
from types import SimpleNamespace


os.environ["GROQ_API_KEY"] = "gsk_test_only_000000000000000000000000"
os.environ["INTERNAL_API_KEY"] = "internal-test-key-0000000000000000"
os.environ["APP_ENV"] = "test"
os.environ["ENABLE_DOCS"] = "true"
os.environ["CORS_ALLOWED_ORIGINS"] = ""
os.environ["DATABASE_ENABLED"] = "false"
os.environ["VOICE_ENABLED"] = "false"

import httpx  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.dependencies import get_vision_service  # noqa: E402
from app.main import app  # noqa: E402
from app.schemas import (  # noqa: E402
    PlanejamentoPopulacionalEntrada,
    PlanoConsultaPopulacional,
    RespostaPopulacionalEntrada,
    RespostaPopulacionalSaida,
)
from app.services.groq_service import (  # noqa: E402
    GroqVisionService,
    PopulationAnswerGeneration,
    PopulationPlanGeneration,
    TokenUsage,
)


CLINIC_ID = "550e8400-e29b-41d4-a716-446655440000"
PLAN_PAYLOAD = {
    "clinic_id": CLINIC_ID,
    "lgpd_nivel": "pseudonimizado",
    "pergunta": "Quais são os dez diagnósticos mais comuns?",
}
ANSWER_PAYLOAD = {
    **PLAN_PAYLOAD,
    "resultado_agregado": {
        "ferramenta": "LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
        "valor": None,
        "unidade": "pacientes",
        "registros_considerados": 40,
        "categorias": [
            {"categoria": "Hipertensão arterial", "quantidade": 18},
            {"categoria": "Diabetes mellitus", "quantidade": 9},
        ],
        "dados_suprimidos": True,
    },
}


class FakePopulationService:
    async def plan_population(self, payload):  # noqa: ANN001, ANN201
        _ = payload
        return PopulationPlanGeneration(
            plano=PlanoConsultaPopulacional(
                ferramenta="LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
                limite=10,
            ),
            usage=TokenUsage(80, 20, 100),
            provider_latency_ms=30,
            model="openai/gpt-oss-20b",
        )

    async def answer_population(self, payload):  # noqa: ANN001, ANN201
        _ = payload
        return PopulationAnswerGeneration(
            resposta=RespostaPopulacionalSaida(
                resposta=(
                    "Hipertensão arterial aparece em 18 registros e diabetes "
                    "mellitus em 9; categorias pequenas foram suprimidas."
                ),
                status_processamento="sucesso",
            ),
            usage=TokenUsage(120, 40, 160),
            provider_latency_ms=45,
            model="openai/gpt-oss-20b",
        )


class FakePopulationGroqCompletions:
    def __init__(
        self,
        tool_name: str = "listar_diagnosticos_mais_comuns",
        tool_arguments: str = '{"limite":10}',
    ) -> None:
        self.calls: list[dict[str, object]] = []
        self.tool_name = tool_name
        self.tool_arguments = tool_arguments

    async def create(self, **kwargs):  # noqa: ANN003, ANN201
        self.calls.append(kwargs)
        if "tools" in kwargs:
            message = SimpleNamespace(
                content=None,
                tool_calls=[
                    SimpleNamespace(
                        function=SimpleNamespace(
                            name=self.tool_name,
                            arguments=self.tool_arguments,
                        )
                    )
                ],
            )
        else:
            message = SimpleNamespace(
                content=RespostaPopulacionalSaida(
                    resposta="Há 40 registros considerados.",
                    status_processamento="sucesso",
                ).model_dump_json(),
                tool_calls=None,
            )
        return SimpleNamespace(
            choices=[SimpleNamespace(message=message)],
            usage=SimpleNamespace(
                prompt_tokens=100,
                completion_tokens=30,
                total_tokens=130,
            ),
        )


class FakePopulationGroqClient:
    def __init__(
        self,
        tool_name: str = "listar_diagnosticos_mais_comuns",
        tool_arguments: str = '{"limite":10}',
    ) -> None:
        self.completions = FakePopulationGroqCompletions(
            tool_name,
            tool_arguments,
        )
        self.chat = SimpleNamespace(completions=self.completions)

    async def close(self) -> None:
        return None


def settings() -> Settings:
    return Settings(
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


class PopulationApiTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self) -> None:
        app.dependency_overrides[get_vision_service] = lambda: FakePopulationService()
        self.lifespan = app.router.lifespan_context(app)
        await self.lifespan.__aenter__()
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self) -> None:
        await self.client.aclose()
        await self.lifespan.__aexit__(None, None, None)
        app.dependency_overrides.clear()

    async def test_planejamento_retorna_enum_e_limite_validados(self) -> None:
        response = await self.client.post(
            "/ai/populacional/planejar",
            json=PLAN_PAYLOAD,
            headers={"X-Internal-API-Key": os.environ["INTERNAL_API_KEY"]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "ferramenta": "LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
                "limite": 10,
            },
        )
        self.assertEqual(response.headers["X-Groq-Total-Tokens"], "100")

    async def test_resposta_aceita_somente_agregado_protegido(self) -> None:
        payload_java = {
            **ANSWER_PAYLOAD,
            "resultado_agregado": {
                chave: valor
                for chave, valor in ANSWER_PAYLOAD["resultado_agregado"].items()
                if chave != "valor"
            },
        }
        response = await self.client.post(
            "/ai/populacional/responder",
            json=payload_java,
            headers={"X-Internal-API-Key": os.environ["INTERNAL_API_KEY"]},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status_processamento"], "sucesso")

        grupo_reidentificavel = {
            **ANSWER_PAYLOAD,
            "resultado_agregado": {
                **ANSWER_PAYLOAD["resultado_agregado"],
                "categorias": [
                    {"categoria": "Doença rara", "quantidade": 1}
                ],
            },
        }
        rejeitada = await self.client.post(
            "/ai/populacional/responder",
            json=grupo_reidentificavel,
            headers={"X-Internal-API-Key": os.environ["INTERNAL_API_KEY"]},
        )
        self.assertEqual(rejeitada.status_code, 422)


class PopulationGroqServiceTest(unittest.IsolatedAsyncioTestCase):
    async def test_planejamento_usa_tool_calling_sem_enviar_tenant(self) -> None:
        service = object.__new__(GroqVisionService)
        service._settings = settings()
        service._client = FakePopulationGroqClient()

        result = await service.plan_population(
            PlanejamentoPopulacionalEntrada.model_validate(PLAN_PAYLOAD)
        )

        arguments = service._client.completions.calls[0]
        self.assertEqual(arguments["tool_choice"], "required")
        self.assertFalse(arguments["parallel_tool_calls"])
        self.assertNotIn(CLINIC_ID, arguments["messages"][1]["content"])
        self.assertEqual(
            result.plano.ferramenta,
            "LISTAR_DIAGNOSTICOS_MAIS_COMUNS",
        )

    async def test_redacao_usa_structured_output_sem_enviar_tenant(self) -> None:
        service = object.__new__(GroqVisionService)
        service._settings = settings()
        service._client = FakePopulationGroqClient()

        await service.answer_population(
            RespostaPopulacionalEntrada.model_validate(ANSWER_PAYLOAD)
        )

        arguments = service._client.completions.calls[0]
        schema = arguments["response_format"]["json_schema"]
        self.assertTrue(schema["strict"])
        self.assertEqual(schema["name"], "primordial_resposta_populacional")
        self.assertNotIn(CLINIC_ID, arguments["messages"][1]["content"])

    async def test_planejador_aceita_ferramenta_agregada_por_sexo(self) -> None:
        service = object.__new__(GroqVisionService)
        service._settings = settings()
        service._client = FakePopulationGroqClient(
            "contar_pacientes_por_sexo",
            "{}",
        )
        payload = {
            **PLAN_PAYLOAD,
            "pergunta": "Quantos pacientes homens existem?",
        }

        result = await service.plan_population(
            PlanejamentoPopulacionalEntrada.model_validate(payload)
        )

        self.assertEqual(
            result.plano.ferramenta,
            "CONTAR_PACIENTES_POR_SEXO",
        )
        tool_names = {
            tool["function"]["name"]
            for tool in service._client.completions.calls[0]["tools"]
        }
        self.assertIn("contar_pacientes_por_sexo", tool_names)


if __name__ == "__main__":
    unittest.main()
