package br.com.primordialdata.visao360.client;

import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("stub")
public class LocalAiGateway implements AiGateway {

    @Override
    public Visao360AiResponse gerarInsights(Visao360AiRequest request) {
        String identificador = request.evolucoes().isEmpty()
                ? "paciente pseudonimizado"
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

    private String extrairToken(String texto) {
        int inicio = texto.indexOf("PACIENTE_");
        if (inicio < 0) {
            return "paciente pseudonimizado";
        }
        int fim = texto.indexOf(' ', inicio);
        return fim < 0 ? texto.substring(inicio) : texto.substring(inicio, fim);
    }
}
