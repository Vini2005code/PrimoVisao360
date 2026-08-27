package br.com.primordialdata.visao360.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ChatDinamicoAiRequest(
        @JsonProperty("clinic_id") UUID clinicId,
        @JsonProperty("lgpd_nivel") String lgpdNivel,
        String pergunta,
        @JsonProperty("contexto_clinico") ContextoClinico contextoClinico
) {
    public record ContextoClinico(
            Visao360AiRequest.Paciente paciente,
            List<Visao360AiRequest.Exame> exames,
            @JsonProperty("sinais_vitais") List<Visao360AiRequest.SinalVital> sinaisVitais,
            List<Visao360AiRequest.Alergia> alergias,
            List<Visao360AiRequest.Evolucao> evolucoes,
            @JsonProperty("insights_persistidos") List<InsightPersistido> insightsPersistidos
    ) {
    }

    public record InsightPersistido(
            @JsonProperty("gerado_em") Instant geradoEm,
            @JsonProperty("resumo_executivo") String resumoExecutivo,
            @JsonProperty("alertas_criticos") List<String> alertasCriticos,
            List<String> tendencias
    ) {
    }
}
