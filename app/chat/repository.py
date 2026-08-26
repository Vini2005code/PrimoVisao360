"""Executor restrito a SELECTs previamente cadastrados pelo backend."""

from __future__ import annotations

import re
from typing import Any

from fastapi.encoders import jsonable_encoder

from app.core.config import Settings
from app.database.client import DatabaseSecurityError, DatabaseUnavailable, ReadOnlyPostgres


_READ_ONLY_PREFIX = re.compile(r"^\s*(?:SELECT|WITH)\b", re.IGNORECASE)
_FORBIDDEN_SQL = re.compile(
    r"\b(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b",
    re.IGNORECASE,
)


def validate_read_only_sql(sql: str) -> str:
    statement = sql.strip()
    if not _READ_ONLY_PREFIX.search(statement):
        raise DatabaseSecurityError("A consulta deve iniciar com SELECT ou WITH.")
    if _FORBIDDEN_SQL.search(statement):
        raise DatabaseSecurityError("A consulta contem um comando nao permitido.")
    if ";" in statement or "--" in statement or "/*" in statement:
        raise DatabaseSecurityError("A consulta contem separador ou comentario nao permitido.")
    return statement


class ClinicalChatRepository:
    def __init__(self, database: ReadOnlyPostgres, settings: Settings) -> None:
        self._database = database
        self._search_path_sql = f'SET LOCAL search_path TO "{settings.db_schema}", pg_catalog'

    async def fetch_controlled(self, sql: str) -> list[dict[str, Any]]:
        statement = validate_read_only_sql(sql)
        try:
            async with self._database.pool.acquire() as connection:
                async with connection.transaction(readonly=True):
                    await connection.execute(self._search_path_sql)
                    records = await connection.fetch(statement)
                    return jsonable_encoder([dict(record) for record in records])
        except DatabaseSecurityError:
            raise
        except Exception:
            raise DatabaseUnavailable(
                "A consulta controlada ao prontuario falhou."
            ) from None

    async def find_identifiers_in_text(self, text: str) -> list[tuple[str, str]]:
        """Localiza somente identificadores literalmente citados no turno."""
        try:
            async with self._database.pool.acquire() as connection:
                async with connection.transaction(readonly=True):
                    await connection.execute(self._search_path_sql)
                    records = await connection.fetch(
                        """
                        SELECT nome_completo, cpf
                        FROM paciente
                        WHERE lower($1) LIKE '%' || lower(nome_completo) || '%'
                           OR regexp_replace($1, '[^0-9]', '', 'g') LIKE
                              '%' || regexp_replace(cpf, '[^0-9]', '', 'g') || '%'
                        LIMIT 20
                        """,
                        text,
                    )
        except Exception:
            raise DatabaseUnavailable(
                "A verificacao efemera de identificadores falhou."
            ) from None

        values: list[tuple[str, str]] = []
        for record in records:
            if record["nome_completo"]:
                values.append(("PACIENTE", str(record["nome_completo"])))
            if record["cpf"]:
                values.append(("CPF", str(record["cpf"])))
        return values
