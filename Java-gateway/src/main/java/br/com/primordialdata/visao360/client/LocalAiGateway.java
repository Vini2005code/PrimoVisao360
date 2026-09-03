package br.com.primordialdata.visao360.client;

import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;
import br.com.primordialdata.visao360.client.dto.PopulacionalPlanejamentoAiRequest;
import br.com.primordialdata.visao360.client.dto.PopulacionalPlanoAiResponse;
import br.com.primordialdata.visao360.client.dto.PopulacionalRespostaAiRequest;
import br.com.primordialdata.visao360.client.dto.PopulacionalRespostaAiResponse;
import br.com.primordialdata.visao360.service.populacional.FerramentaPopulacional;
import java.util.List;
import java.util.Locale;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("stub")
public class LocalAiGateway implements AiGateway {

    @Override
    public Visao360AiResponse gerarInsights(Visao360AiRequest request) {
        String identificador = request.evolucoes().isEmpty()
                ? "PACIENTE_" + request.paciente().idPseudonimo()
                : extrairToken(request.evolucoes().getFirst().texto());
        String diagnostico = request.paciente().diagnosticos().isEmpty()
                ? "sem diagnóstico informado"
                : request.paciente().diagnosticos().getFirst().descricao();

        return new Visao360AiResponse(
                "Resumo descritivo de " + identificador + ": " + diagnostico + ".",
                List.of("Modo local: resposta simulada, sem inferência clínica."),
                List.of("Não há série temporal suficiente para calcular tendências."),
                "sucesso"
        );
    }

    @Override
    public ChatDinamicoAiResponse responderChat(ChatDinamicoAiRequest request) {
        return new ChatDinamicoAiResponse(
                "Resposta de teste para a pergunta: " + request.pergunta(),
                "sucesso"
        );
    }

    @Override
    public PopulacionalPlanoAiResponse planejarConsultaPopulacional(
            PopulacionalPlanejamentoAiRequest request
    ) {
        String pergunta = request.pergunta().toLowerCase(Locale.ROOT);
        if (pergunta.contains("homem") || pergunta.contains("mascul")
                || pergunta.contains("mulher") || pergunta.contains("feminin")
                || pergunta.contains("sexo")) {
            return new PopulacionalPlanoAiResponse(
                    FerramentaPopulacional.CONTAR_PACIENTES_POR_SEXO,
                    null
            );
        }
        if (pergunta.contains("idade") && pergunta.contains("média")) {
            return new PopulacionalPlanoAiResponse(
                    FerramentaPopulacional.CALCULAR_IDADE_MEDIA,
                    null
            );
        }
        if (pergunta.contains("diagnóstico") || pergunta.contains("doença")) {
            return new PopulacionalPlanoAiResponse(
                    FerramentaPopulacional.LISTAR_DIAGNOSTICOS_MAIS_COMUNS,
                    10
            );
        }
        return new PopulacionalPlanoAiResponse(
                FerramentaPopulacional.CONTAR_PACIENTES,
                null
        );
    }

    @Override
    public PopulacionalRespostaAiResponse responderConsultaPopulacional(
            PopulacionalRespostaAiRequest request
    ) {
        var resultado = request.resultadoAgregado();
        String resposta = resultado.valor() == null
                ? "Foram encontradas " + resultado.categorias().size()
                        + " categorias agregadas disponíveis."
                : "O resultado agregado é " + resultado.valor().toPlainString()
                        + " " + resultado.unidade() + ".";
        return new PopulacionalRespostaAiResponse(resposta, "sucesso");
    }

    private String extrairToken(String texto) {
        int inicio = texto.indexOf("PACIENTE_");
        if (inicio < 0) {
            return "paciente pseudonimizado";
        }
        int fim = texto.indexOf(' ', inicio);
        return fim < 0 ? texto.substring(inicio) : texto.substring(inicio, fim);
    }
}
