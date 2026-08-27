package br.com.primordialdata.visao360.client;

import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;

public interface AiGateway {

    Visao360AiResponse gerarInsights(Visao360AiRequest request);

    ChatDinamicoAiResponse responderChat(ChatDinamicoAiRequest request);
}
