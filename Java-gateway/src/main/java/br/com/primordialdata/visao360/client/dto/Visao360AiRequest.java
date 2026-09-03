package br.com.primordialdata.visao360.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public record Visao360AiRequest(
        @JsonProperty("clinic_id") UUID clinicId,
        @JsonProperty("lgpd_nivel") String lgpdNivel,
        Paciente paciente,
        List<Exame> exames,
        @JsonProperty("sinais_vitais") List<SinalVital> sinaisVitais,
        List<Alergia> alergias,
        List<Evolucao> evolucoes,
        List<Medicamento> medicamentos
) {
    public Visao360AiRequest {
        Objects.requireNonNull(clinicId, "clinicId é obrigatório");
        Objects.requireNonNull(lgpdNivel, "lgpdNivel é obrigatório");
        Objects.requireNonNull(paciente, "paciente é obrigatório");
        exames = listaSegura(exames);
        sinaisVitais = listaSegura(sinaisVitais);
        alergias = listaSegura(alergias);
        evolucoes = listaSegura(evolucoes);
        medicamentos = listaSegura(medicamentos);
    }

    public record Paciente(
            @JsonProperty("id_pseudonimo") UUID idPseudonimo,
            int idade,
            String sexo,
            String status,
            List<Diagnostico> diagnosticos
    ) {
        public Paciente {
            Objects.requireNonNull(idPseudonimo, "idPseudonimo é obrigatório");
            diagnosticos = listaSegura(diagnosticos);
        }
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
            BigDecimal valor,
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

    public record Medicamento(
            @JsonProperty("nome_medicamento") String nomeMedicamento,
            String dose,
            String unidade,
            String via,
            String frequencia,
            @JsonProperty("iniciado_em") LocalDate iniciadoEm,
            @JsonProperty("encerrado_em") LocalDate encerradoEm,
            String status
    ) {
    }

    /**
     * Snapshot opcional armazenado como JSON no campo legado historico_clinico.
     * Campos desconhecidos são ignorados para permitir evolução do prontuário,
     * mas o DTO enviado ao FastAPI permanece fechado e explicitamente tipado.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HistoricoClinicoEstruturado(
            List<Diagnostico> diagnosticos,
            List<Exame> exames,
            @JsonProperty("sinais_vitais") List<SinalVital> sinaisVitais,
            List<Alergia> alergias,
            List<Evolucao> evolucoes,
            List<Medicamento> medicamentos
    ) {
        public HistoricoClinicoEstruturado {
            diagnosticos = listaSegura(diagnosticos);
            exames = listaSegura(exames);
            sinaisVitais = listaSegura(sinaisVitais);
            alergias = listaSegura(alergias);
            evolucoes = listaSegura(evolucoes);
            medicamentos = listaSegura(medicamentos);
        }
    }

    private static <T> List<T> listaSegura(List<T> valores) {
        return valores == null ? List.of() : List.copyOf(valores);
    }
}
