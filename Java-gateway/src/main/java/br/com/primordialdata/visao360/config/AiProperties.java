package br.com.primordialdata.visao360.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.ai")
public record AiProperties(
        @NotNull URI baseUrl,
        @NotBlank String internalApiKey,
        @NotNull Duration timeout
) {
}
