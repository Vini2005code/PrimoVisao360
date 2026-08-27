package br.com.primordialdata.visao360.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "visao360_insight",
        indexes = @Index(
                name = "idx_visao360_insight_clinica_prontuario_data",
                columnList = "clinic_id, prontuario_id, gerado_em"
        )
)
public class Visao360Insight {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "clinic_id", nullable = false, updatable = false)
    private UUID clinicId;

    @Column(name = "prontuario_id", nullable = false, updatable = false)
    private UUID prontuarioId;

    @Column(name = "token_paciente", nullable = false, updatable = false, length = 80)
    private String tokenPaciente;

    @Column(name = "resumo_executivo", nullable = false, columnDefinition = "text")
    private String resumoExecutivo;

    @Column(name = "alertas_criticos_json", nullable = false, columnDefinition = "text")
    private String alertasCriticosJson;

    @Column(name = "tendencias_json", nullable = false, columnDefinition = "text")
    private String tendenciasJson;

    @Column(name = "status_processamento", nullable = false, length = 32)
    private String statusProcessamento;

    @Column(name = "gerado_em", nullable = false, updatable = false)
    private Instant geradoEm;

    protected Visao360Insight() {
    }

    public Visao360Insight(
            UUID id,
            UUID clinicId,
            UUID prontuarioId,
            String tokenPaciente,
            String resumoExecutivo,
            String alertasCriticosJson,
            String tendenciasJson,
            String statusProcessamento,
            Instant geradoEm
    ) {
        this.id = Objects.requireNonNull(id);
        this.clinicId = Objects.requireNonNull(clinicId);
        this.prontuarioId = Objects.requireNonNull(prontuarioId);
        this.tokenPaciente = Objects.requireNonNull(tokenPaciente);
        this.resumoExecutivo = Objects.requireNonNull(resumoExecutivo);
        this.alertasCriticosJson = Objects.requireNonNull(alertasCriticosJson);
        this.tendenciasJson = Objects.requireNonNull(tendenciasJson);
        this.statusProcessamento = Objects.requireNonNull(statusProcessamento);
        this.geradoEm = Objects.requireNonNull(geradoEm);
    }

    public UUID getId() {
        return id;
    }

    public UUID getClinicId() {
        return clinicId;
    }

    public UUID getProntuarioId() {
        return prontuarioId;
    }

    public String getTokenPaciente() {
        return tokenPaciente;
    }

    public String getResumoExecutivo() {
        return resumoExecutivo;
    }

    public String getAlertasCriticosJson() {
        return alertasCriticosJson;
    }

    public String getTendenciasJson() {
        return tendenciasJson;
    }

    public String getStatusProcessamento() {
        return statusProcessamento;
    }

    public Instant getGeradoEm() {
        return geradoEm;
    }
}
