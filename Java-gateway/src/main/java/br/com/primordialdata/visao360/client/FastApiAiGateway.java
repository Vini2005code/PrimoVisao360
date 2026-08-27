package br.com.primordialdata.visao360.client;

import br.com.primordialdata.visao360.client.dto.Visao360AiRequest;
import br.com.primordialdata.visao360.client.dto.Visao360AiResponse;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiRequest;
import br.com.primordialdata.visao360.client.dto.ChatDinamicoAiResponse;
import java.util.Objects;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
@Profile("!stub")
public class FastApiAiGateway implements AiGateway {

    private final RestClient restClient;

    public FastApiAiGateway(RestClient visao360AiRestClient) {
        this.restClient = visao360AiRestClient;
    }

    @Override
    public Visao360AiResponse gerarInsights(Visao360AiRequest request) {
        return post("/ai/gerar-visao-360", request, Visao360AiResponse.class);
    }

    @Override
    public ChatDinamicoAiResponse responderChat(ChatDinamicoAiRequest request) {
        return post("/ai/chat-dinamico", request, ChatDinamicoAiResponse.class);
    }

    private <T> T post(String uri, Object request, Class<T> responseType) {
        try {
            T response = restClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(responseType);
            return Objects.requireNonNull(response, "O FastAPI devolveu corpo vazio.");
        } catch (RestClientException | NullPointerException exception) {
            throw new AiGatewayException("O Motor de IA está indisponível ou devolveu resposta inválida.", exception);
        }
    }
}
