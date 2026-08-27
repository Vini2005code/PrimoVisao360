package br.com.primordialdata.visao360.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(
        name = "prontuario_paciente",
        indexes = @Index(
                name = "idx_prontuario_clinica_paciente",
                columnList = "clinic_id, paciente_id",
                unique = true
        )
)
public class ProntuarioPaciente {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "clinic_id", nullable = false, updatable = false)
    private UUID clinicId;

    @Column(name = "paciente_id", nullable = false, updatable = false)
    private UUID pacienteId;

    @Column(name = "nome_paciente", nullable = false, length = 200)
    private String nomePaciente;

    @Column(name = "idade", nullable = false)
    private Integer idade;

    @Column(name = "sexo", nullable = false, length = 32)
    private String sexo;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "diagnostico", nullable = false, length = 500)
    private String diagnostico;

    @Column(name = "historico_clinico", nullable = false, length = 100_000)
    private String historicoClinico;

    @Column(name = "atualizado_em", nullable = false)
    private LocalDate atualizadoEm;

    protected ProntuarioPaciente() {
    }

    public ProntuarioPaciente(
            UUID id,
            UUID clinicId,
            UUID pacienteId,
            String nomePaciente,
            Integer idade,
            String sexo,
            String status,
            String diagnostico,
            String historicoClinico,
            LocalDate atualizadoEm
    ) {
        this.id = Objects.requireNonNull(id);
        this.clinicId = Objects.requireNonNull(clinicId);
        this.pacienteId = Objects.requireNonNull(pacienteId);
        this.nomePaciente = Objects.requireNonNull(nomePaciente);
        this.idade = Objects.requireNonNull(idade);
        this.sexo = Objects.requireNonNull(sexo);
        this.status = Objects.requireNonNull(status);
        this.diagnostico = Objects.requireNonNull(diagnostico);
        this.historicoClinico = Objects.requireNonNull(historicoClinico);
        this.atualizadoEm = Objects.requireNonNull(atualizadoEm);
    }

    public UUID getId() {
        return id;
    }

    public UUID getClinicId() {
        return clinicId;
    }

    public UUID getPacienteId() {
        return pacienteId;
    }

    public String getNomePaciente() {
        return nomePaciente;
    }

    public Integer getIdade() {
        return idade;
    }

    public String getSexo() {
        return sexo;
    }

    public String getStatus() {
        return status;
    }

    public String getDiagnostico() {
        return diagnostico;
    }

    public String getHistoricoClinico() {
        return historicoClinico;
    }

    public LocalDate getAtualizadoEm() {
        return atualizadoEm;
    }
}
