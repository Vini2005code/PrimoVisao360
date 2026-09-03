package br.com.primordialdata.visao360.domain.repository;

import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProntuarioPacienteRepository extends JpaRepository<ProntuarioPaciente, UUID> {

    Optional<ProntuarioPaciente> findByPacienteIdAndClinicId(UUID pacienteId, UUID clinicId);

    @Query("""
            select paciente.sexo as sexo, count(paciente) as quantidade
            from ProntuarioPaciente paciente
            where paciente.clinicId = :clinicId
            group by paciente.sexo
            """)
    List<SexoQuantidade> contarPacientesPorSexo(@Param("clinicId") UUID clinicId);

    interface SexoQuantidade {
        String getSexo();

        long getQuantidade();
    }
}
