package br.com.primordialdata.visao360.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ChatDinamicoResponse(
        String resposta,
        @JsonProperty("status_processamento") String statusProcessamento
) {
}
