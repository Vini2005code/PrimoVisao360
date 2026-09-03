package br.com.primordialdata.visao360.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class DatabaseUrlResolverTest {

    @Test
    void converteUrlCompativelComPythonParaJdbc() {
        DatabaseUrlResolver.ResolvedDatabaseUrl resolved = DatabaseUrlResolver.resolve(
                "postgresql://app:senha%20forte@localhost:5432/primordial?sslmode=require",
                "",
                ""
        );

        assertEquals(
                "jdbc:postgresql://localhost:5432/primordial?sslmode=require",
                resolved.jdbcUrl()
        );
        assertEquals("app", resolved.username());
        assertEquals("senha forte", resolved.password());
    }

    @Test
    void credenciaisExplicitasSobrescrevemUrl() {
        DatabaseUrlResolver.ResolvedDatabaseUrl resolved = DatabaseUrlResolver.resolve(
                "postgres://original:original@db:5432/primordial",
                "primordial_app",
                "segredo"
        );

        assertEquals("primordial_app", resolved.username());
        assertEquals("segredo", resolved.password());
    }

    @Test
    void rejeitaEsquemaNaoPostgresql() {
        assertThrows(
                IllegalStateException.class,
                () -> DatabaseUrlResolver.resolve("mysql://app:senha@db/base", "", "")
        );
    }
}
