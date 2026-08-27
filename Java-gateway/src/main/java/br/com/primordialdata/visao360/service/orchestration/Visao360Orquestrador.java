package br.com.primordialdata.visao360.service.orchestration;

import br.com.primordialdata.visao360.client.AiGateway;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;
import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.controller.dto.ChatDinamicoResponse;
import br.com.primordialdata.visao360.controller.dto.Visao360Response;
import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import br.com.primordialdata.visao360.domain.entity.Visao360Insight;
import br.com.primordialdata.visao360.lgpd.service.PseudonimizacaoService;
import br.com.primordialdata.visao360.lgpd.service.PseudonimizacaoService.PseudonimizacaoResultado;
import br.com.primordialdata.visao360.service.persistence.Visao360InsightStore;
import br.com.primordialdata.visao360.tenant.TenantContext;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class Visao360Orquestrador {

    private final ProntuarioTenantReader prontuarioReader;
    private final PseudonimizacaoService pseudonimizacaoService;
    private final AiGateway aiGateway;
    private final Visao360InsightStore insightStore;

    public Visao360Orquestrador(
            ProntuarioTenantReader prontuarioReader,
            PseudonimizacaoService pseudonimizacaoService,
            AiGateway aiGateway,
            Visao360InsightStore insightStore
    ) {
        this.prontuarioReader = prontuarioReader;
        this.pseudonimizacaoService = pseudonimizacaoService;
        this.aiGateway = aiGateway;
        this.insightStore = insightStore;
    }

    public Visao360Response gerarInsights(UUID pacienteId) {
        UUID clinicId = TenantContext.requireClinicId();
        ProntuarioPaciente prontuario = prontuarioReader.buscar(pacienteId, clinicId);

        PseudonimizacaoResultado contexto = pseudonimizacaoService.pseudonimizar(
                prontuario.getNomePaciente(),
                prontuario.getHistoricoClinico()
        );
        Visao360AiResponse respostaPseudonimizada = aiGateway.gerarInsights(
                montarPayloadIa(clinicId, prontuario, contexto.textoPseudonimizado())
        );
        Visao360Insight insight = insightStore.salvar(
                clinicId,
                prontuario.getId(),
                contexto.tokenPaciente(),
                respostaPseudonimizada
        );

        return montarResposta(insight, prontuario.getNomePaciente());
    }

    public List<Visao360Response> listarHistorico(UUID pacienteId) {
        UUID clinicId = TenantContext.requireClinicId();
        ProntuarioPaciente prontuario = prontuarioReader.buscar(pacienteId, clinicId);
        return insightStore.listar(clinicId, prontuario.getId()).stream()
                .map(insight -> montarResposta(insight, prontuario.getNomePaciente()))
                .toList();
    }

    public void excluirInsight(UUID insightId) {
        insightStore.excluir(TenantContext.requireClinicId(), insightId);
    }

    public ChatDinamicoResponse responderChat(UUID pacienteId, String pergunta) {
        UUID clinicId = TenantContext.requireClinicId();
        ProntuarioPaciente prontuario = prontuarioReader.buscar(pacienteId, clinicId);
        PseudonimizacaoResultado contexto = pseudonimizacaoService.pseudonimizar(
                prontuario.getNomePaciente(),
                prontuario.getHistoricoClinico()
        );
        Visao360AiRequest contextoBase = montarPayloadIa(
                clinicId,
                prontuario,
                contexto.textoPseudonimizado()
        );
        List<ChatDinamicoAiRequest.InsightPersistido> insights = insightStore
                .listar(clinicId, prontuario.getId())
                .stream()
                .map(insight -> normalizarInsight(insight, contexto.tokenPaciente()))
                .toList();
        ChatDinamicoAiRequest request = new ChatDinamicoAiRequest(
                clinicId,
                "pseudonimizado",
                pseudonimizacaoService.pseudonimizar(contexto, pergunta),
                new ChatDinamicoAiRequest.ContextoClinico(
                        contextoBase.paciente(),
                        contextoBase.exames(),
                        contextoBase.sinaisVitais(),
                        contextoBase.alergias(),
                        contextoBase.evolucoes(),
                        insights
                )
        );
        ChatDinamicoAiResponse response = aiGateway.responderChat(request);
        return new ChatDinamicoResponse(
                pseudonimizacaoService.reidentificar(contexto, response.resposta()),
                response.statusProcessamento()
        );
    }

    private Visao360AiRequest montarPayloadIa(
            UUID clinicId,
            ProntuarioPaciente prontuario,
            String historicoPseudonimizado
    ) {
        Visao360AiRequest.Diagnostico diagnostico = new Visao360AiRequest.Diagnostico(
                null,
                prontuario.getDiagnostico(),
                prontuario.getStatus(),
                null
        );
        Visao360AiRequest.Paciente paciente = new Visao360AiRequest.Paciente(
                prontuario.getIdade(),
                prontuario.getSexo(),
                prontuario.getStatus(),
                List.of(diagnostico)
        );
        Visao360AiRequest.Evolucao evolucao = new Visao360AiRequest.Evolucao(
                historicoPseudonimizado,
                prontuario.getAtualizadoEm(),
                "evolucao_clinica"
        );
        return new Visao360AiRequest(
                clinicId,
                "pseudonimizado",
                paciente,
                List.of(),
                List.of(),
                List.of(),
                List.of(evolucao)
        );
    }

    private Visao360Response montarResposta(
            Visao360Insight insight,
            String nomePaciente
    ) {
        return new Visao360Response(
                insight.getId(),
                insight.getGeradoEm(),
                pseudonimizacaoService.reidentificar(
                        insight.getTokenPaciente(),
                        nomePaciente,
                        insight.getResumoExecutivo()
                ),
                reidentificarLista(
                        insight.getTokenPaciente(),
                        nomePaciente,
                        insightStore.desserializar(insight.getAlertasCriticosJson())
                ),
                reidentificarLista(
                        insight.getTokenPaciente(),
                        nomePaciente,
                        insightStore.desserializar(insight.getTendenciasJson())
                ),
                insight.getStatusProcessamento()
        );
    }

    private ChatDinamicoAiRequest.InsightPersistido normalizarInsight(
            Visao360Insight insight,
            String tokenAtual
    ) {
        return new ChatDinamicoAiRequest.InsightPersistido(
                insight.getGeradoEm(),
                substituirToken(insight.getResumoExecutivo(), insight, tokenAtual),
                substituirTokens(
                        insightStore.desserializar(insight.getAlertasCriticosJson()),
                        insight,
                        tokenAtual
                ),
                substituirTokens(
                        insightStore.desserializar(insight.getTendenciasJson()),
                        insight,
                        tokenAtual
                )
        );
    }

    private List<String> substituirTokens(
            List<String> textos,
            Visao360Insight insight,
            String tokenAtual
    ) {
        return textos.stream()
                .map(texto -> substituirToken(texto, insight, tokenAtual))
                .toList();
    }

    private String substituirToken(
            String texto,
            Visao360Insight insight,
            String tokenAtual
    ) {
        return pseudonimizacaoService.substituirTokenPaciente(
                texto,
                insight.getTokenPaciente(),
                tokenAtual
        );
    }

    private List<String> reidentificarLista(
            String tokenPaciente,
            String nomePaciente,
            List<String> textos
    ) {
        if (textos == null) {
            return List.of();
        }
        return textos.stream()
                .map(texto -> pseudonimizacaoService.reidentificar(
                        tokenPaciente,
                        nomePaciente,
                        texto
                ))
                .toList();
    }
}
