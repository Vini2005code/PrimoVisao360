package br.com.primordialdata.visao360.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record PopulacionalPlanejamentoAiRequest(
        @JsonProperty("clinic_id") UUID clinicId,
        @JsonProperty("lgpd_nivel") String lgpdNivel,
        String pergunta
) {
}
