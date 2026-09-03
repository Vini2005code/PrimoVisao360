package br.com.primordialdata.visao360.domain.repository;

import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Repositório deliberadamente somente leitura. Não expõe save, delete ou SQL arbitrário.
 */
public interface PopulacionalRepository extends Repository<ProntuarioPaciente, UUID> {

    @Query("""
            select count(paciente.id)
            from ProntuarioPaciente paciente
            where paciente.clinicId = :clinicId
            """)
    long contarPacientes(@Param("clinicId") UUID clinicId);

    @Query("""
            select paciente.sexo as categoria, count(paciente.id) as quantidade
            from ProntuarioPaciente paciente
            where paciente.clinicId = :clinicId
            group by paciente.sexo
            order by count(paciente.id) desc
            """)
    List<SexoQuantidade> contarPacientesPorSexo(@Param("clinicId") UUID clinicId);

    @Query("""
            select avg(paciente.idade)
            from ProntuarioPaciente paciente
            where paciente.clinicId = :clinicId
              and paciente.idade is not null
            """)
    Double calcularIdadeMedia(@Param("clinicId") UUID clinicId);

    @Query("""
            select
                trim(paciente.diagnostico) as categoria,
                count(distinct paciente.pacienteId) as quantidade
            from ProntuarioPaciente paciente
            where paciente.clinicId = :clinicId
              and paciente.diagnostico is not null
              and trim(paciente.diagnostico) <> ''
              and lower(trim(paciente.diagnostico)) <> 'sem diagnóstico registrado'
            group by trim(paciente.diagnostico)
            order by quantidade desc, categoria asc
            """)
    List<DiagnosticoQuantidade> listarDiagnosticosMaisComuns(
            @Param("clinicId") UUID clinicId,
            Pageable pageable
    );

    interface DiagnosticoQuantidade {
        String getCategoria();

        long getQuantidade();
    }

    interface SexoQuantidade {
        String getCategoria();

        long getQuantidade();
    }
}
