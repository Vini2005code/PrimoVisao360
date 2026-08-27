package br.com.primordialdata.visao360.service.persistence;

import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.domain.entity.Visao360Insight;
import br.com.primordialdata.visao360.domain.repository.Visao360InsightRepository;
import br.com.primordialdata.visao360.service.orchestration.InsightNaoEncontradoException;
import br.com.primordialdata.visao360.tenant.rls.ClinicRls;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class Visao360InsightStore {

    private static final Logger LOGGER = LoggerFactory.getLogger(Visao360InsightStore.class);
    private static final TypeReference<List<String>> LISTA_STRINGS = new TypeReference<>() {
    };

    private final Visao360InsightRepository repository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public Visao360InsightStore(
            Visao360InsightRepository repository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.clock = Clock.systemUTC();
    }

    @ClinicRls(readOnly = false)
    public Visao360Insight salvar(
            UUID clinicId,
            UUID prontuarioId,
            String tokenPaciente,
            Visao360AiResponse respostaPseudonimizada
    ) {
        Visao360Insight insight = new Visao360Insight(
                UUID.randomUUID(),
                clinicId,
                prontuarioId,
                tokenPaciente,
                respostaPseudonimizada.resumoExecutivo(),
                serializar(respostaPseudonimizada.alertasCriticos()),
                serializar(respostaPseudonimizada.tendencias()),
                respostaPseudonimizada.statusProcessamento(),
                Instant.now(clock)
        );
        return repository.saveAndFlush(insight);
    }

    @ClinicRls
    public List<Visao360Insight> listar(UUID clinicId, UUID prontuarioId) {
        return repository.findAllByClinicIdAndProntuarioIdOrderByGeradoEmDesc(
                clinicId,
                prontuarioId
        );
    }

    @ClinicRls(readOnly = false)
    public void excluir(UUID clinicId, UUID insightId) {
        Visao360Insight insight = repository.findByIdAndClinicId(insightId, clinicId)
                .orElseThrow(() -> new InsightNaoEncontradoException(insightId));
        repository.delete(insight);
        repository.flush();
        LOGGER.info(
                "visao360_insight_deleted clinic_id={} insight_id={}",
                clinicId,
                insightId
        );
    }

    public List<String> desserializar(String json) {
        try {
            return List.copyOf(objectMapper.readValue(json, LISTA_STRINGS));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Insight persistido contém JSON inválido.", exception);
        }
    }

    private String serializar(List<String> valores) {
        try {
            return objectMapper.writeValueAsString(valores == null ? List.of() : valores);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Não foi possível serializar o insight.", exception);
        }
    }
}
