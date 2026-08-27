package br.com.primordialdata.visao360.controller.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record Visao360Request(
        @NotNull @JsonProperty("paciente_id") UUID pacienteId
) {
}
