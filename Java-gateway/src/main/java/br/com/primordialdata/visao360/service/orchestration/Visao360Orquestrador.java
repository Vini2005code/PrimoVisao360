package br.com.primordialdata.visao360.service.orchestration;

import br.com.primordialdata.visao360.client.AiGateway;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;
import br.com.primordialdata.visao360.client.dto.PopulacionalPlanejamentoAiRequest;
import br.com.primordialdata.visao360.client.dto.PopulacionalPlanoAiResponse;
import br.com.primordialdata.visao360.client.dto.PopulacionalRespostaAiRequest;
import br.com.primordialdata.visao360.client.dto.PopulacionalRespostaAiResponse;
import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.controller.dto.ChatDinamicoResponse;
import br.com.primordialdata.visao360.controller.dto.Visao360Response;
import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import br.com.primordialdata.visao360.domain.entity.Visao360Insight;
import br.com.primordialdata.visao360.lgpd.service.PseudonimizacaoService;
import br.com.primordialdata.visao360.lgpd.service.PseudonimizacaoService.PseudonimizacaoResultado;
import br.com.primordialdata.visao360.service.persistence.Visao360InsightStore;
import br.com.primordialdata.visao360.service.populacional.ConsultaPopulacionalExecutor;
import br.com.primordialdata.visao360.service.populacional.dto.PlanoConsultaPopulacional;
import br.com.primordialdata.visao360.service.populacional.dto.ResultadoAgregado;
import br.com.primordialdata.visao360.tenant.TenantContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class Visao360Orquestrador {

    private final ProntuarioTenantReader prontuarioReader;
    private final PseudonimizacaoService pseudonimizacaoService;
    private final AiGateway aiGateway;
    private final Visao360InsightStore insightStore;
    private final ConsultaPopulacionalExecutor consultaPopulacionalExecutor;
    private final ObjectMapper objectMapper;

    public Visao360Orquestrador(
            ProntuarioTenantReader prontuarioReader,
            PseudonimizacaoService pseudonimizacaoService,
            AiGateway aiGateway,
            Visao360InsightStore insightStore,
            ConsultaPopulacionalExecutor consultaPopulacionalExecutor,
            ObjectMapper objectMapper
    ) {
        this.prontuarioReader = prontuarioReader;
        this.pseudonimizacaoService = pseudonimizacaoService;
        this.aiGateway = aiGateway;
        this.insightStore = insightStore;
        this.consultaPopulacionalExecutor = consultaPopulacionalExecutor;
        this.objectMapper = objectMapper;
    }

    public Visao360Response gerarInsights(UUID pacienteId) {
        UUID clinicId = TenantContext.requireClinicId();
        ProntuarioPaciente prontuario = prontuarioReader.buscar(pacienteId, clinicId);

        PseudonimizacaoResultado contexto = pseudonimizacaoService.pseudonimizar(
                prontuario.getNomePaciente(),
                prontuario.getHistoricoClinico()
        );
        Visao360AiResponse respostaPseudonimizada = aiGateway.gerarInsights(
                montarPayloadIa(clinicId, prontuario, contexto)
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
                contexto
        );
        List<ChatDinamicoAiRequest.InsightPersistido> insights = insightStore
                .listar(clinicId, prontuario.getId())
                .stream()
                .map(insight -> normalizarInsight(insight, contexto.tokenPaciente()))
                .toList();
        ProntuarioTenantReader.EstatisticasClinica estatisticas =
                prontuarioReader.resumirClinica(clinicId);
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
                        contextoBase.medicamentos(),
                        insights,
                        new ChatDinamicoAiRequest.EstatisticasClinica(
                                estatisticas.totalPacientes(),
                                estatisticas.pacientesPorSexo().stream()
                                        .map(item -> new ChatDinamicoAiRequest.QuantidadePorSexo(
                                                normalizarCodigoDominio(item.sexo()),
                                                item.quantidade()
                                        ))
                                        .toList()
                        )
                )
        );
        ChatDinamicoAiResponse response = aiGateway.responderChat(request);
        return new ChatDinamicoResponse(
                pseudonimizacaoService.reidentificar(contexto, response.resposta()),
                response.statusProcessamento()
        );
    }

    public ChatDinamicoResponse responderChatPopulacional(String pergunta) {
        UUID clinicId = TenantContext.requireClinicId();
        String perguntaPseudonimizada =
                pseudonimizacaoService.pseudonimizarPerguntaPopulacional(pergunta);

        PopulacionalPlanoAiResponse planejamento =
                aiGateway.planejarConsultaPopulacional(
                        new PopulacionalPlanejamentoAiRequest(
                                clinicId,
                                "pseudonimizado",
                                perguntaPseudonimizada
                        )
                );
        PlanoConsultaPopulacional plano = new PlanoConsultaPopulacional(
                planejamento.ferramenta(),
                planejamento.limite()
        );
        ResultadoAgregado resultado = consultaPopulacionalExecutor.executar(
                clinicId,
                plano
        );
        PopulacionalRespostaAiResponse resposta =
                aiGateway.responderConsultaPopulacional(
                        PopulacionalRespostaAiRequest.from(
                                clinicId,
                                perguntaPseudonimizada,
                                resultado
                        )
                );
        return new ChatDinamicoResponse(
                resposta.resposta(),
                resposta.statusProcessamento()
        );
    }

    Visao360AiRequest montarPayloadIa(
            UUID clinicId,
            ProntuarioPaciente prontuario,
            PseudonimizacaoResultado contexto
    ) {
        Visao360AiRequest.HistoricoClinicoEstruturado historico =
                lerHistoricoEstruturado(prontuario.getHistoricoClinico());
        List<Visao360AiRequest.Diagnostico> diagnosticos = historico == null
                || historico.diagnosticos().isEmpty()
                ? List.of(new Visao360AiRequest.Diagnostico(
                        null,
                        pseudonimizarCampo(contexto, prontuario.getDiagnostico()),
                        normalizarStatus(prontuario.getStatus()),
                        null
                ))
                : historico.diagnosticos().stream()
                        .map(item -> new Visao360AiRequest.Diagnostico(
                                pseudonimizarCampo(contexto, item.codigo()),
                                pseudonimizarCampo(contexto, item.descricao()),
                                normalizarStatus(item.status()),
                                item.diagnosticadoEm()
                        ))
                        .toList();
        Visao360AiRequest.Paciente paciente = new Visao360AiRequest.Paciente(
                contexto.pacientePseudonimoId(),
                prontuario.getIdade(),
                normalizarCodigoDominio(prontuario.getSexo()),
                normalizarStatus(prontuario.getStatus()),
                diagnosticos
        );

        List<Visao360AiRequest.Exame> exames = historico == null
                ? List.of()
                : historico.exames().stream()
                        .map(item -> new Visao360AiRequest.Exame(
                                pseudonimizarCampo(contexto, item.tipo()),
                                pseudonimizarCampo(contexto, item.resultadoTexto()),
                                item.processadoEm()
                        ))
                        .toList();
        List<Visao360AiRequest.SinalVital> sinaisVitais = historico == null
                ? List.of()
                : historico.sinaisVitais().stream()
                        .map(item -> new Visao360AiRequest.SinalVital(
                                pseudonimizarCampo(contexto, item.tipo()),
                                item.valor(),
                                pseudonimizarCampo(contexto, item.unidade()),
                                item.aferidoEm()
                        ))
                        .toList();
        List<Visao360AiRequest.Alergia> alergias = historico == null
                ? List.of()
                : historico.alergias().stream()
                        .map(item -> new Visao360AiRequest.Alergia(
                                pseudonimizarCampo(contexto, item.substancia()),
                                pseudonimizarCampo(contexto, item.reacao()),
                                normalizarStatus(item.gravidade())
                        ))
                        .toList();
        List<Visao360AiRequest.Evolucao> evolucoes = historico == null
                ? List.of(new Visao360AiRequest.Evolucao(
                        contexto.textoPseudonimizado(),
                        prontuario.getAtualizadoEm(),
                        "evolucao_clinica"
                ))
                : historico.evolucoes().stream()
                        .map(item -> new Visao360AiRequest.Evolucao(
                                pseudonimizarCampo(contexto, item.texto()),
                                item.registradaEm(),
                                pseudonimizarCampo(contexto, item.tipo())
                        ))
                        .toList();
        List<Visao360AiRequest.Medicamento> medicamentos = historico == null
                ? List.of()
                : historico.medicamentos().stream()
                        .map(item -> new Visao360AiRequest.Medicamento(
                                pseudonimizarCampo(contexto, item.nomeMedicamento()),
                                pseudonimizarCampo(contexto, item.dose()),
                                pseudonimizarCampo(contexto, item.unidade()),
                                pseudonimizarCampo(contexto, item.via()),
                                pseudonimizarCampo(contexto, item.frequencia()),
                                item.iniciadoEm(),
                                item.encerradoEm(),
                                normalizarStatus(item.status())
                        ))
                        .toList();
        return new Visao360AiRequest(
                clinicId,
                "pseudonimizado",
                paciente,
                exames,
                sinaisVitais,
                alergias,
                evolucoes,
                medicamentos
        );
    }

    private Visao360AiRequest.HistoricoClinicoEstruturado lerHistoricoEstruturado(
            String historicoClinico
    ) {
        String texto = historicoClinico == null ? "" : historicoClinico.trim();
        if (!texto.startsWith("{")) {
            return null;
        }
        try {
            return objectMapper.readValue(
                    texto,
                    Visao360AiRequest.HistoricoClinicoEstruturado.class
            );
        } catch (JsonProcessingException exception) {
            return null;
        }
    }

    private String pseudonimizarCampo(
            PseudonimizacaoResultado contexto,
            String valor
    ) {
        if (valor == null || valor.isBlank()) {
            return null;
        }
        return pseudonimizacaoService.pseudonimizar(contexto, valor);
    }

    private String normalizarCodigoDominio(String valor) {
        String normalizado = normalizarTextoDeCodigo(valor).toUpperCase(Locale.ROOT);
        return normalizado.isBlank() ? "NAO_INFORMADO" : normalizado;
    }

    private String normalizarStatus(String valor) {
        String normalizado = normalizarTextoDeCodigo(valor).toLowerCase(Locale.ROOT);
        return normalizado.isBlank() ? "nao_informado" : normalizado;
    }

    private String normalizarTextoDeCodigo(String valor) {
        if (valor == null) {
            return "";
        }
        return Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
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
