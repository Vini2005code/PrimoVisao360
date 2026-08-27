package br.com.primordialdata.visao360.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record Visao360Response(
        @JsonProperty("insight_id") UUID insightId,
        @JsonProperty("gerado_em") Instant geradoEm,
        @JsonProperty("resumo_executivo") String resumoExecutivo,
        @JsonProperty("alertas_criticos") List<String> alertasCriticos,
        List<String> tendencias,
        @JsonProperty("status_processamento") String statusProcessamento
) {
}
