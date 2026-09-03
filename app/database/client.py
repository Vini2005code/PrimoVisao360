"""Pool PostgreSQL com sessao obrigatoriamente somente leitura."""

from __future__ import annotations

import asyncio
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

        max_attempts = self._settings.database_connect_max_attempts
        for attempt in range(1, max_attempts + 1):
            try:
                pool = await self._create_verified_pool()
            except DatabaseSecurityError:
                # Uma violacao de read-only nao e transitoria e nunca deve ser repetida.
                raise
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                if attempt >= max_attempts:
                    logger.error(
                        "database_connection_exhausted attempts=%d error_type=%s",
                        max_attempts,
                        type(exc).__name__,
                    )
                    raise DatabaseUnavailable(
                        "Nao foi possivel conectar ao PostgreSQL com seguranca."
                    ) from None

                delay = min(
                    self._settings.database_connect_backoff_initial_seconds
                    * (2 ** (attempt - 1)),
                    self._settings.database_connect_backoff_max_seconds,
                )
                logger.warning(
                    "database_connection_retry attempt=%d max_attempts=%d "
                    "next_delay_seconds=%.2f error_type=%s",
                    attempt,
                    max_attempts,
                    delay,
                    type(exc).__name__,
                )
                await asyncio.sleep(delay)
                continue

            self._pool = pool
            logger.info("database_connected mode=read_only attempts=%d", attempt)
            return

    async def _create_verified_pool(self) -> Pool:
        pool: Pool | None = None
        credentials: dict[str, str] = {}
        if self._settings.database_username:
            credentials["user"] = self._settings.database_username
        if self._settings.database_password:
            credentials["password"] = self._settings.database_password

        try:
            pool = await asyncpg.create_pool(
                dsn=self._settings.database_url,
                **credentials,
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
        except asyncio.CancelledError:
            if pool is not None:
                await pool.close()
            raise
        except Exception:
            if pool is not None:
                await pool.close()
            raise

        return pool

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
