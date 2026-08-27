package br.com.primordialdata.visao360.controller;

import static br.com.primordialdata.visao360.config.LocalDemoDataConfiguration.CLINICA_A;
import static br.com.primordialdata.visao360.config.LocalDemoDataConfiguration.CLINICA_B;
import static br.com.primordialdata.visao360.config.LocalDemoDataConfiguration.PACIENTE_A;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.primordialdata.visao360.domain.entity.Visao360Insight;
import br.com.primordialdata.visao360.domain.repository.Visao360InsightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"local", "stub"})
class Visao360ControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private Visao360InsightRepository insightRepository;

    @Test
    void iniciaFluxoCompletoComTenantValido() throws Exception {
        mockMvc.perform(post("/api/v1/visao360/insights")
                        .header("X-Clinic-ID", CLINICA_A)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paciente_id\":\"" + PACIENTE_A + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status_processamento").value("sucesso"))
                .andExpect(jsonPath("$.resumo_executivo").value(org.hamcrest.Matchers.containsString("Paciente Demonstração")));
    }

    @Test
    void rejeitaRequisicaoSemTenant() throws Exception {
        mockMvc.perform(post("/api/v1/visao360/insights")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paciente_id\":\"" + PACIENTE_A + "\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void mesmoPacienteLogicoNaoVazaEntreClinicas() throws Exception {
        mockMvc.perform(post("/api/v1/visao360/insights")
                        .header("X-Clinic-ID", CLINICA_B)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paciente_id\":\"" + PACIENTE_A + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumo_executivo").value(org.hamcrest.Matchers.containsString("Paciente Outra Clínica")))
                .andExpect(jsonPath("$.resumo_executivo").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Paciente Demonstração"))));
    }

    @Test
    void persistePseudonimizadoAteDeleteExplicitoESegregaTenant() throws Exception {
        String resposta = mockMvc.perform(post("/api/v1/visao360/insights")
                        .header("X-Clinic-ID", CLINICA_A)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"paciente_id\":\"" + PACIENTE_A + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.insight_id").isNotEmpty())
                .andExpect(jsonPath("$.gerado_em").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        UUID insightId = UUID.fromString(
                objectMapper.readTree(resposta).path("insight_id").asText()
        );
        Visao360Insight persistido = insightRepository.findById(insightId).orElseThrow();
        assertFalse(persistido.getResumoExecutivo().contains("Paciente Demonstração"));
        assertTrue(persistido.getResumoExecutivo().contains("PACIENTE_"));

        JsonNode historicoAntes = listarHistorico(CLINICA_A);
        assertTrue(contemInsight(historicoAntes, insightId));

        mockMvc.perform(delete("/api/v1/visao360/insights/{insightId}", insightId)
                        .header("X-Clinic-ID", CLINICA_B))
                .andExpect(status().isNotFound());
        assertTrue(contemInsight(listarHistorico(CLINICA_A), insightId));

        mockMvc.perform(delete("/api/v1/visao360/insights/{insightId}", insightId)
                        .header("X-Clinic-ID", CLINICA_A))
                .andExpect(status().isNoContent());
        assertFalse(contemInsight(listarHistorico(CLINICA_A), insightId));
    }

    @Test
    void chatPassaPeloGatewayPseudonimizaEReidentifica() throws Exception {
        mockMvc.perform(post(
                        "/api/v1/visao360/pacientes/{pacienteId}/chat",
                        PACIENTE_A
                )
                        .header("X-Clinic-ID", CLINICA_A)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "pergunta": "Como está Paciente Demonstração? Contato joao@example.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status_processamento").value("sucesso"))
                .andExpect(jsonPath("$.resposta").value(
                        org.hamcrest.Matchers.containsString("Paciente Demonstração")
                ))
                .andExpect(jsonPath("$.resposta").value(
                        org.hamcrest.Matchers.not(
                                org.hamcrest.Matchers.containsString("joao@example.com")
                        )
                ));
    }

    private JsonNode listarHistorico(UUID clinicId) throws Exception {
        String resposta = mockMvc.perform(get(
                        "/api/v1/visao360/pacientes/{pacienteId}/insights",
                        PACIENTE_A
                ).header("X-Clinic-ID", clinicId))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(resposta);
    }

    private boolean contemInsight(JsonNode historico, UUID insightId) {
        for (JsonNode item : historico) {
            if (insightId.toString().equals(item.path("insight_id").asText())) {
                return true;
            }
        }
        return false;
    }
}
