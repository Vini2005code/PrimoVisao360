package br.com.primordialdata.visao360.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Visao360AiResponse(
        @JsonProperty("resumo_executivo") String resumoExecutivo,
        @JsonProperty("alertas_criticos") List<String> alertasCriticos,
        List<String> tendencias,
        @JsonProperty("status_processamento") String statusProcessamento
) {
}
