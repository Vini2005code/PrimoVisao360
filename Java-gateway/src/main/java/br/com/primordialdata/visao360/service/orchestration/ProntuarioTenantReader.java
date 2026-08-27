package br.com.primordialdata.visao360.service.orchestration;

import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import br.com.primordialdata.visao360.domain.repository.ProntuarioPacienteRepository;
import br.com.primordialdata.visao360.tenant.rls.ClinicRls;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ProntuarioTenantReader {

    private final ProntuarioPacienteRepository repository;

    public ProntuarioTenantReader(ProntuarioPacienteRepository repository) {
        this.repository = repository;
    }

    @ClinicRls
    public ProntuarioPaciente buscar(UUID pacienteId, UUID clinicId) {
        return repository.findByPacienteIdAndClinicId(pacienteId, clinicId)
                .orElseThrow(() -> new ProntuarioNaoEncontradoException(pacienteId));
    }
}
