package br.com.primordialdata.visao360.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record Visao360AiRequest(
        @JsonProperty("clinic_id") UUID clinicId,
        @JsonProperty("lgpd_nivel") String lgpdNivel,
        Paciente paciente,
        List<Exame> exames,
        @JsonProperty("sinais_vitais") List<SinalVital> sinaisVitais,
        List<Alergia> alergias,
        List<Evolucao> evolucoes
) {
    public record Paciente(
            int idade,
            String sexo,
            String status,
            List<Diagnostico> diagnosticos
    ) {
    }

    public record Diagnostico(
            String codigo,
            String descricao,
            String status,
            @JsonProperty("diagnosticado_em") LocalDate diagnosticadoEm
    ) {
    }

    public record Exame(
            String tipo,
            @JsonProperty("resultado_texto") String resultadoTexto,
            @JsonProperty("processado_em") LocalDate processadoEm
    ) {
    }

    public record SinalVital(
            String tipo,
            Number valor,
            String unidade,
            @JsonProperty("aferido_em") LocalDate aferidoEm
    ) {
    }

    public record Alergia(String substancia, String reacao, String gravidade) {
    }

    public record Evolucao(
            String texto,
            @JsonProperty("registrada_em") LocalDate registradaEm,
            String tipo
    ) {
    }
}
