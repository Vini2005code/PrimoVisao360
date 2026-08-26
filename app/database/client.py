"""Pool PostgreSQL com sessao obrigatoriamente somente leitura."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import asyncpg

from app.core.config import Settings

if TYPE_CHECKING:
    from asyncpg.pool import Pool


logger = logging.getLogger(__name__)


class DatabaseUnavailable(RuntimeError):
    """O banco nao esta acessivel com as garantias exigidas."""


class DatabaseSecurityError(RuntimeError):
    """A configuracao do banco viola uma trava de seguranca."""


class ReadOnlyPostgres:
    """Encapsula o pool sem expor escrita ou execucao de SQL arbitrario."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._pool: Pool | None = None

    @property
    def pool(self) -> Pool:
        if self._pool is None:
            raise DatabaseUnavailable("Conexao PostgreSQL indisponivel.")
        return self._pool

    async def connect(self) -> None:
        if self._pool is not None:
            return
        pool: Pool | None = None
        try:
            pool = await asyncpg.create_pool(
                dsn=self._settings.database_url,
                min_size=self._settings.database_min_pool_size,
                max_size=self._settings.database_max_pool_size,
                timeout=self._settings.database_connect_timeout_seconds,
                command_timeout=self._settings.database_statement_timeout_ms / 1_000,
                server_settings={
                    "application_name": "primordial-inteligencia-360",
                    "default_transaction_read_only": "on",
                    "statement_timeout": str(self._settings.database_statement_timeout_ms),
                    "idle_in_transaction_session_timeout": "5000",
                },
            )
            if pool is None:
                raise DatabaseUnavailable("Pool PostgreSQL nao foi criado.")
            async with pool.acquire() as connection:
                read_only = await connection.fetchval("SHOW default_transaction_read_only")
                if str(read_only).casefold() != "on":
                    raise DatabaseSecurityError(
                        "O PostgreSQL recusou a sessao obrigatoriamente somente leitura."
                    )
                await connection.fetchval("SELECT 1")
        except DatabaseSecurityError:
            if pool is not None:
                await pool.close()
            raise
        except Exception as exc:
            if pool is not None:
                await pool.close()
            logger.error(
                "database_connection_failed error_type=%s",
                type(exc).__name__,
            )
            raise DatabaseUnavailable(
                "Nao foi possivel conectar ao PostgreSQL com seguranca."
            ) from None

        self._pool = pool
        logger.info("database_connected mode=read_only")

    async def ping(self) -> bool:
        try:
            async with self.pool.acquire() as connection:
                return await connection.fetchval("SELECT 1") == 1
        except Exception:
            return False

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            logger.info("database_disconnected")
