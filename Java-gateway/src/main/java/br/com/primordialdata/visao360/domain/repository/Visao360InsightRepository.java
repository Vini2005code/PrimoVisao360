package br.com.primordialdata.visao360.domain.repository;

import br.com.primordialdata.visao360.domain.entity.Visao360Insight;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface Visao360InsightRepository extends JpaRepository<Visao360Insight, UUID> {

    List<Visao360Insight> findAllByClinicIdAndProntuarioIdOrderByGeradoEmDesc(
            UUID clinicId,
            UUID prontuarioId
    );

    Optional<Visao360Insight> findByIdAndClinicId(UUID id, UUID clinicId);
}
