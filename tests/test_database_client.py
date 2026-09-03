from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, call, patch

from app.core.config import Settings
from app.database.client import (
    DatabaseSecurityError,
    DatabaseUnavailable,
    ReadOnlyPostgres,
)


class FakeConnection:
    def __init__(self, *, read_only: str = "on") -> None:
        self.read_only = read_only

    async def fetchval(self, query: str) -> str | int:
        if query == "SHOW default_transaction_read_only":
            return self.read_only
        return 1


class FakeAcquire:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    async def __aenter__(self) -> FakeConnection:
        return self.connection

    async def __aexit__(self, *_args: object) -> None:
        return None


class FakePool:
    def __init__(self, *, read_only: str = "on") -> None:
        self.connection = FakeConnection(read_only=read_only)
        self.closed = False

    def acquire(self) -> FakeAcquire:
        return FakeAcquire(self.connection)

    async def close(self) -> None:
        self.closed = True


def settings() -> Settings:
    return Settings(
        app_env="test",
        cors_allowed_origins=(),
        docs_enabled=True,
        groq_api_key="gsk_test_only_000000000000000000000000",
        groq_max_completion_tokens=1200,
        groq_max_retries=0,
        groq_model="openai/gpt-oss-20b",
        groq_timeout_seconds=5,
        internal_api_key="internal-test-key-0000000000000000",
        log_level="INFO",
        database_enabled=True,
        database_url="postgresql://postgres:5432/primordial_test",
        database_username="primordial_app",
        database_password="test-secret",
        database_connect_max_attempts=3,
        database_connect_backoff_initial_seconds=0.25,
        database_connect_backoff_max_seconds=0.5,
    )


class ReadOnlyPostgresTest(unittest.IsolatedAsyncioTestCase):
    async def test_retries_with_exponential_backoff_then_connects(self) -> None:
        pool = FakePool()
        create_pool = AsyncMock(
            side_effect=[ConnectionRefusedError(), ConnectionRefusedError(), pool]
        )
        sleep = AsyncMock()
        database = ReadOnlyPostgres(settings())

        with (
            patch("app.database.client.asyncpg.create_pool", create_pool),
            patch("app.database.client.asyncio.sleep", sleep),
        ):
            await database.connect()

        self.assertIs(database.pool, pool)
        self.assertEqual(create_pool.await_count, 3)
        self.assertEqual(sleep.await_args_list, [call(0.25), call(0.5)])

    async def test_exhausted_retries_raise_database_unavailable(self) -> None:
        create_pool = AsyncMock(side_effect=ConnectionRefusedError())
        sleep = AsyncMock()
        database = ReadOnlyPostgres(settings())

        with (
            patch("app.database.client.asyncpg.create_pool", create_pool),
            patch("app.database.client.asyncio.sleep", sleep),
        ):
            with self.assertRaises(DatabaseUnavailable):
                await database.connect()

        self.assertEqual(create_pool.await_count, 3)
        self.assertEqual(sleep.await_args_list, [call(0.25), call(0.5)])

    async def test_read_write_session_fails_without_retry(self) -> None:
        pool = FakePool(read_only="off")
        create_pool = AsyncMock(return_value=pool)
        sleep = AsyncMock()
        database = ReadOnlyPostgres(settings())

        with (
            patch("app.database.client.asyncpg.create_pool", create_pool),
            patch("app.database.client.asyncio.sleep", sleep),
        ):
            with self.assertRaises(DatabaseSecurityError):
                await database.connect()

        self.assertTrue(pool.closed)
        create_pool.assert_awaited_once()
        sleep.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()
