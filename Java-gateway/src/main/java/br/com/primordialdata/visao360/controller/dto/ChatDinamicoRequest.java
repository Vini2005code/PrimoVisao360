package br.com.primordialdata.visao360.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatDinamicoRequest(
        @NotBlank
        @Size(min = 3, max = 1_000)
        String pergunta
) {
}
