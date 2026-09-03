package br.com.primordialdata.visao360.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

final class DatabaseUrlResolver {

    private DatabaseUrlResolver() {
    }

    static ResolvedDatabaseUrl resolve(
            String rawUrl,
            String explicitUsername,
            String explicitPassword
    ) {
        if (rawUrl == null || rawUrl.isBlank()) {
            throw new IllegalStateException("DATABASE_URL não foi definida para o perfil postgres.");
        }

        String trimmedUrl = rawUrl.trim();
        if (trimmedUrl.startsWith("jdbc:postgresql://")) {
            return new ResolvedDatabaseUrl(
                    trimmedUrl,
                    requireCredential(explicitUsername, "DATABASE_USERNAME"),
                    requireCredential(explicitPassword, "DATABASE_PASSWORD")
            );
        }

        URI uri;
        try {
            uri = URI.create(trimmedUrl);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("DATABASE_URL possui formato inválido.", exception);
        }
        if (!"postgresql".equalsIgnoreCase(uri.getScheme())
                && !"postgres".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalStateException(
                    "DATABASE_URL deve usar postgresql://, postgres:// ou jdbc:postgresql://."
            );
        }
        if (uri.getHost() == null || uri.getPath() == null || uri.getPath().length() < 2) {
            throw new IllegalStateException("DATABASE_URL deve informar host e nome do banco.");
        }

        String[] userInfo = splitUserInfo(uri.getRawUserInfo());
        String username = firstNonBlank(explicitUsername, userInfo[0]);
        String password = firstNonBlank(explicitPassword, userInfo[1]);
        String authority = uri.getHost() + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        return new ResolvedDatabaseUrl(
                "jdbc:postgresql://" + authority + uri.getRawPath() + query,
                requireCredential(username, "usuário PostgreSQL"),
                requireCredential(password, "senha PostgreSQL")
        );
    }

    private static String[] splitUserInfo(String rawUserInfo) {
        if (rawUserInfo == null || rawUserInfo.isBlank()) {
            return new String[]{"", ""};
        }
        String[] values = rawUserInfo.split(":", 2);
        return new String[]{
                decode(values[0]),
                values.length == 2 ? decode(values[1]) : ""
        };
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static String firstNonBlank(String preferred, String fallback) {
        return preferred != null && !preferred.isBlank() ? preferred.trim() : fallback;
    }

    private static String requireCredential(String value, String description) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(description + " não informado.");
        }
        return value;
    }

    record ResolvedDatabaseUrl(String jdbcUrl, String username, String password) {
    }
}
