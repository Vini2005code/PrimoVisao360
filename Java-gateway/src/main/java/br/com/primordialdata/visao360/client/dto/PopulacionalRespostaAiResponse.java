package br.com.primordialdata.visao360.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PopulacionalRespostaAiResponse(
        String resposta,
        @JsonProperty("status_processamento") String statusProcessamento
) {
}
