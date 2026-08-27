package br.com.primordialdata.visao360.domain.repository;

import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProntuarioPacienteRepository extends JpaRepository<ProntuarioPaciente, UUID> {

    Optional<ProntuarioPaciente> findByPacienteIdAndClinicId(UUID pacienteId, UUID clinicId);
}
