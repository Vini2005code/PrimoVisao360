package br.com.primordialdata.visao360.service.orchestration;

import java.util.UUID;

public class InsightNaoEncontradoException extends RuntimeException {

    public InsightNaoEncontradoException(UUID insightId) {
        super("Insight não encontrado: " + insightId);
    }
}
