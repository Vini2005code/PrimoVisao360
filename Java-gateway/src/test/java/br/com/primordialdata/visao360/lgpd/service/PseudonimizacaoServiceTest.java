package br.com.primordialdata.visao360.lgpd.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PseudonimizacaoServiceTest {

    private final PseudonimizacaoService service = new PseudonimizacaoService();

    @Test
    void removeNomeEOutrosIdentificadoresSemPersistirMapeamentoGlobal() {
        var resultado = service.pseudonimizar(
                "João Fonseca",
                "João Fonseca, CPF 123.456.789-01, e-mail joao@example.com, telefone (11) 99999-9999."
        );

        assertThat(resultado.textoPseudonimizado())
                .doesNotContain("João Fonseca", "123.456.789-01", "joao@example.com", "99999-9999")
                .contains(resultado.tokenPaciente(), "[CPF_REMOVIDO]", "[EMAIL_REMOVIDO]", "[TELEFONE_REMOVIDO]");
        assertThat(resultado.textoPseudonimizado()).containsOnlyOnce(resultado.tokenPaciente());
        assertThat(resultado.tokenPaciente())
                .isEqualTo("PACIENTE_" + resultado.pacientePseudonimoId());
        assertThat(service.reidentificar(resultado, "Resumo de " + resultado.tokenPaciente()))
                .isEqualTo("Resumo de João Fonseca");
    }

    @Test
    void removeCnsERgSemAlterarDatasNemValoresClinicos() {
        var resultado = service.pseudonimizar(
                "João Fonseca",
                "CNS 123456789012345; RG: 12.345.678-9; aferido em 2024-03-15: 138.5 mmHg"
        );

        assertThat(resultado.textoPseudonimizado())
                .contains("[CNS_REMOVIDO]", "[RG_REMOVIDO]", "2024-03-15", "138.5 mmHg")
                .doesNotContain("123456789012345", "12.345.678-9");
    }

    @Test
    void reutilizaMesmoTokenAoPseudonimizarPerguntaDoChat() {
        var contexto = service.pseudonimizar(
                "João Fonseca",
                "Evolução clínica de João Fonseca."
        );

        String pergunta = service.pseudonimizar(
                contexto,
                "Como está João Fonseca? CPF 123.456.789-01"
        );

        assertThat(pergunta)
                .doesNotContain("João Fonseca", "123.456.789-01")
                .contains(contexto.tokenPaciente(), "[CPF_REMOVIDO]");
        assertThat(service.reidentificar(contexto, pergunta))
                .contains("João Fonseca")
                .doesNotContain("123.456.789-01");
    }

    @Test
    void removeIdentificadoresDaPerguntaPopulacionalSemCriarCofreDeReidentificacao() {
        String pergunta = service.pseudonimizarPerguntaPopulacional(
                "Quantos registros de João Fonseca existem? CPF 123.456.789-01"
        );

        assertThat(pergunta)
                .doesNotContain("João Fonseca", "123.456.789-01")
                .contains("[PESSOA_REMOVIDA]", "[CPF_REMOVIDO]");
    }
}
