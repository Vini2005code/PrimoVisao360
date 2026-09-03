package br.com.primordialdata.visao360.client;

import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;
import br.com.primordialdata.visao360.client.dto.PopulacionalPlanejamentoAiRequest;
import br.com.primordialdata.visao360.client.dto.PopulacionalPlanoAiResponse;
import br.com.primordialdata.visao360.client.dto.PopulacionalRespostaAiRequest;
import br.com.primordialdata.visao360.client.dto.PopulacionalRespostaAiResponse;

public interface AiGateway {

    Visao360AiResponse gerarInsights(Visao360AiRequest request);

    ChatDinamicoAiResponse responderChat(ChatDinamicoAiRequest request);

    PopulacionalPlanoAiResponse planejarConsultaPopulacional(
            PopulacionalPlanejamentoAiRequest request
    );

    PopulacionalRespostaAiResponse responderConsultaPopulacional(
            PopulacionalRespostaAiRequest request
    );
}
