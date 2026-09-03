package br.com.primordialdata.visao360.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile({"postgres", "mvp"})
public class PostgresDataSourceConfiguration {

    private static final Pattern SAFE_SCHEMA = Pattern.compile("[a-z_][a-z0-9_]{0,62}");

    @Bean(destroyMethod = "close")
    DataSource dataSource(
            @Value("${app.database.url}") String databaseUrl,
            @Value("${app.database.username:}") String databaseUsername,
            @Value("${app.database.password:}") String databasePassword,
            @Value("${app.database.schema}") String schema,
            @Value("${DB_POOL_MAX_SIZE:10}") int maximumPoolSize,
            @Value("${DB_POOL_MIN_IDLE:2}") int minimumIdle,
            @Value("${DB_CONNECTION_TIMEOUT_MS:10000}") long connectionTimeoutMs,
            @Value("${DB_LEAK_DETECTION_MS:30000}") long leakDetectionMs
    ) {
        validateSchema(schema);
        DatabaseUrlResolver.ResolvedDatabaseUrl resolved = DatabaseUrlResolver.resolve(
                databaseUrl,
                databaseUsername,
                databasePassword
        );

        HikariConfig config = new HikariConfig();
        config.setPoolName("PrimordialRlsPool");
        config.setDriverClassName("org.postgresql.Driver");
        config.setJdbcUrl(resolved.jdbcUrl());
        config.setUsername(resolved.username());
        config.setPassword(resolved.password());
        config.setSchema(schema);
        config.setConnectionInitSql("SET search_path TO \"" + schema + "\", public");
        config.setMaximumPoolSize(maximumPoolSize);
        config.setMinimumIdle(minimumIdle);
        config.setConnectionTimeout(connectionTimeoutMs);
        config.setValidationTimeout(Math.min(3_000L, connectionTimeoutMs));
        config.setLeakDetectionThreshold(leakDetectionMs);
        config.setAutoCommit(false);
        return new HikariDataSource(config);
    }

    private static void validateSchema(String schema) {
        if (schema == null || !SAFE_SCHEMA.matcher(schema).matches()) {
            throw new IllegalStateException("DB_SCHEMA possui identificador inválido.");
        }
    }
}
