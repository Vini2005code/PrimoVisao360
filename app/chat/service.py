"""Classificacao deterministica de perguntas para consultas SQL cadastradas."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

from app.chat.repository import ClinicalChatRepository
from app.chat.schemas import ChatAnswer, ChatType


SUGGESTIONS = (
    "Quantos pacientes existem?",
    "Quais pacientes têm doenças raras?",
    "Quais pacientes têm diabetes e usam insulina?",
    "Quais medicamentos estão em uso?",
    "Quais pacientes usam suplementos?",
    "Quais pacientes têm maior risco cardiometabólico?",
)


@dataclass(frozen=True, slots=True)
class ControlledQuery:
    kind: ChatType
    sql: str
    singular: str
    plural: str


QUERIES: dict[str, ControlledQuery] = {
    "total": ControlledQuery(
        kind="total_pacientes",
        sql="SELECT COUNT(*) AS total_pacientes FROM paciente",
        singular="Existe 1 paciente cadastrado.",
        plural="Existem {count} pacientes cadastrados.",
    ),
    "raras": ControlledQuery(
        kind="doencas_raras",
        sql="""
            SELECT paciente_id, nome_completo, cpf, cid10, nome_diagnostico,
                   complexidade, especialidade, medicamentos
            FROM vw_pacientes_doencas_raras
            ORDER BY paciente_id
            LIMIT 100
        """,
        singular="Encontrei 1 paciente com doença rara.",
        plural="Encontrei {count} pacientes com doenças raras.",
    ),
    "diabetes_insulina": ControlledQuery(
        kind="diabetes_insulina",
        sql="""
            SELECT paciente_id, nome_completo, cpf,
                   medicamento_padronizado_catalogo, dose_por_administracao,
                   via_administracao, frequencia_intervalo,
                   indicacao_motivo_uso, situacao_uso, adesao_uso_real
            FROM vw_medicamentos_pesquisa
            WHERE indicacao_motivo_uso ILIKE '%diabetes%'
              AND medicamento_padronizado_catalogo ILIKE '%insulina%'
            ORDER BY paciente_id
            LIMIT 100
        """,
        singular="Encontrei 1 paciente com diabetes que usa insulina.",
        plural="Encontrei {count} pacientes com diabetes que usam insulina.",
    ),
    "medicamentos": ControlledQuery(
        kind="medicamentos_em_uso",
        sql="""
            SELECT paciente_id, nome_completo,
                   medicamento_padronizado_catalogo, tipo_item,
                   dose_por_administracao, via_administracao,
                   frequencia_intervalo, indicacao_motivo_uso,
                   situacao_uso, adesao_uso_real
            FROM vw_medicamentos_pesquisa
            WHERE situacao_uso = 'Em uso'
            ORDER BY paciente_id
            LIMIT 100
        """,
        singular="Encontrei 1 medicamento em uso.",
        plural="Encontrei {count} medicamentos em uso.",
    ),
    "suplementos": ControlledQuery(
        kind="suplementos",
        sql="""
            SELECT p.id AS paciente_id, p.nome_completo,
                   me.medicamento_padronizado_catalogo, me.tipo_item,
                   me.esporte_objetivo_uso, me.esporte_status_antidoping_tue,
                   me.esporte_certificacao_suplemento, me.adesao_uso_real
            FROM medicamento_em_uso me
            JOIN paciente p ON p.id = me.paciente_id
            WHERE me.tipo_item = 'Suplemento/ergogênico'
            ORDER BY p.id
            LIMIT 100
        """,
        singular="Encontrei 1 paciente que usa suplemento.",
        plural="Encontrei {count} pacientes que usam suplementos.",
    ),
    "risco": ControlledQuery(
        kind="risco_cardiometabolico",
        sql="""
            SELECT paciente_id, nome_completo, cpf, idade, imc,
                   pa_sistolica, pa_diastolica, ldl, hba1c, diagnosticos
            FROM vw_risco_cardiometabolico
            WHERE imc >= 30 OR pa_sistolica >= 140 OR hba1c >= 8 OR ldl >= 130
            ORDER BY hba1c DESC NULLS LAST, ldl DESC NULLS LAST,
                     imc DESC NULLS LAST
            LIMIT 50
        """,
        singular="Encontrei 1 paciente com indicador de risco cardiometabólico elevado.",
        plural="Encontrei {count} pacientes com indicadores de risco cardiometabólico elevado.",
    ),
}


def _normalize_question(question: str) -> str:
    without_accents = "".join(
        character
        for character in unicodedata.normalize("NFKD", question.casefold())
        if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", " ", without_accents).strip()


def classify_question(question: str) -> ControlledQuery | None:
    normalized = _normalize_question(question)
    if "diabetes" in normalized and "insulina" in normalized:
        return QUERIES["diabetes_insulina"]
    if "doenca" in normalized and "rara" in normalized:
        return QUERIES["raras"]
    if "suplement" in normalized:
        return QUERIES["suplementos"]
    if "risco" in normalized and "cardiometabol" in normalized:
        return QUERIES["risco"]
    if "medicamento" in normalized and ("uso" in normalized or "usando" in normalized):
        return QUERIES["medicamentos"]
    if "paciente" in normalized and any(
        term in normalized for term in ("quantos", "quantidade", "total", "numero")
    ):
        return QUERIES["total"]
    return None


class ClinicalChatService:
    def __init__(self, repository: ClinicalChatRepository) -> None:
        self._repository = repository

    async def answer(self, question: str) -> ChatAnswer:
        query = classify_question(question)
        if query is None:
            return ChatAnswer(
                tipo="nao_entendido",
                mensagem="Ainda não tenho uma consulta cadastrada para essa pergunta.",
                sugestoes=list(SUGGESTIONS),
            )

        rows = await self._repository.fetch_controlled(query.sql)
        if query.kind == "total_pacientes":
            count = int(rows[0]["total_pacientes"]) if rows else 0
        else:
            count = len(rows)
        message = query.singular if count == 1 else query.plural.format(count=count)
        return ChatAnswer(tipo=query.kind, mensagem=message, dados=rows)

    async def find_sensitive_values(self, text: str) -> list[tuple[str, str]]:
        return await self._repository.find_identifiers_in_text(text)
