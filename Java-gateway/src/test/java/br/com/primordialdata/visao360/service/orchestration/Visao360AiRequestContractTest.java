package br.com.primordialdata.visao360.service.orchestration;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import br.com.primordialdata.visao360.lgpd.service.PseudonimizacaoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class Visao360AiRequestContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules()
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    private final PseudonimizacaoService pseudonimizacao = new PseudonimizacaoService();

    @Test
    void preservaEstruturaValoresECronologiaSemEnviarIdentificadores() throws Exception {
        UUID clinicId = UUID.fromString("11111111-1111-4111-8111-111111111111");
        UUID pacienteId = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
        String historico = """
                {
                  "diagnosticos": [
                    {
                      "codigo": "I10",
                      "descricao": "Hipertensão arterial",
                      "status": "ATIVO",
                      "diagnosticado_em": "2024-01-10"
                    }
                  ],
                  "exames": [
                    {
                      "tipo": "Hemograma",
                      "resultado_texto": "Resultado de João Fonseca; e-mail joao@example.com",
                      "processado_em": "2024-03-15"
                    }
                  ],
                  "sinais_vitais": [
                    {
                      "tipo": "pressao_sistolica",
                      "valor": 138.5,
                      "unidade": "mmHg",
                      "aferido_em": "2024-03-15"
                    },
                    {
                      "tipo": "pressao_sistolica",
                      "valor": 126,
                      "unidade": "mmHg",
                      "aferido_em": "2024-04-15"
                    }
                  ],
                  "alergias": [],
                  "evolucoes": [
                    {
                      "texto": "João Fonseca compareceu. CPF 123.456.789-01.",
                      "registrada_em": "2024-04-15",
                      "tipo": "ambulatorial"
                    }
                  ],
                  "medicamentos": [
                    {
                      "nome_medicamento": "Losartana",
                      "dose": "50",
                      "unidade": "mg",
                      "via": "oral",
                      "frequencia": "1 vez ao dia",
                      "iniciado_em": "2024-01-10",
                      "encerrado_em": null,
                      "status": "ATIVO"
                    }
                  ]
                }
                """;
        ProntuarioPaciente prontuario = new ProntuarioPaciente(
                UUID.randomUUID(),
                clinicId,
                pacienteId,
                "João Fonseca",
                42,
                "M",
                "ATIVO",
                "Hipertensão arterial",
                historico,
                LocalDate.of(2024, 4, 15)
        );
        var contexto = pseudonimizacao.pseudonimizar(
                prontuario.getNomePaciente(),
                prontuario.getHistoricoClinico()
        );
        Visao360Orquestrador orquestrador = new Visao360Orquestrador(
                null,
                pseudonimizacao,
                null,
                null,
                null,
                objectMapper
        );

        Visao360AiRequest request = orquestrador.montarPayloadIa(
                clinicId,
                prontuario,
                contexto
        );
        String json = objectMapper.writeValueAsString(request);

        assertThat(request.paciente().idPseudonimo())
                .isEqualTo(contexto.pacientePseudonimoId())
                .isNotEqualTo(pacienteId);
        assertThat(request.exames()).hasSize(1);
        assertThat(request.sinaisVitais()).extracting(Visao360AiRequest.SinalVital::valor)
                .containsExactly(new BigDecimal("138.5"), new BigDecimal("126"));
        assertThat(request.sinaisVitais()).extracting(Visao360AiRequest.SinalVital::aferidoEm)
                .containsExactly(LocalDate.of(2024, 3, 15), LocalDate.of(2024, 4, 15));
        assertThat(request.medicamentos()).hasSize(1);
        assertThat(request.medicamentos().getFirst().iniciadoEm())
                .isEqualTo(LocalDate.of(2024, 1, 10));
        assertThat(json)
                .contains("\"id_pseudonimo\"", "\"sinais_vitais\"", "\"medicamentos\"")
                .contains("138.5", "2024-03-15", "2024-04-15")
                .doesNotContain(
                        "João Fonseca",
                        "123.456.789-01",
                        "joao@example.com",
                        pacienteId.toString()
                );
    }
}
