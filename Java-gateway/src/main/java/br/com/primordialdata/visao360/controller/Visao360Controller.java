package br.com.primordialdata.visao360.controller;

import br.com.primordialdata.visao360.controller.dto.Visao360Request;
import br.com.primordialdata.visao360.controller.dto.Visao360Response;
import br.com.primordialdata.visao360.controller.dto.ChatDinamicoRequest;
import br.com.primordialdata.visao360.controller.dto.ChatDinamicoResponse;
import br.com.primordialdata.visao360.service.orchestration.Visao360Orquestrador;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/visao360")
public class Visao360Controller {

    private final Visao360Orquestrador orquestrador;

    public Visao360Controller(Visao360Orquestrador orquestrador) {
        this.orquestrador = orquestrador;
    }

    @PostMapping("/insights")
    public ResponseEntity<Visao360Response> gerarInsights(
            @Valid @RequestBody Visao360Request request
    ) {
        return ResponseEntity.ok(orquestrador.gerarInsights(request.pacienteId()));
    }

    @GetMapping("/pacientes/{pacienteId}/insights")
    public ResponseEntity<List<Visao360Response>> listarHistorico(
            @PathVariable UUID pacienteId
    ) {
        return ResponseEntity.ok(orquestrador.listarHistorico(pacienteId));
    }

    @DeleteMapping("/insights/{insightId}")
    public ResponseEntity<Void> excluirInsight(@PathVariable UUID insightId) {
        orquestrador.excluirInsight(insightId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/pacientes/{pacienteId}/chat")
    public ResponseEntity<ChatDinamicoResponse> responderChat(
            @PathVariable UUID pacienteId,
            @Valid @RequestBody ChatDinamicoRequest request
    ) {
        return ResponseEntity.ok(
                orquestrador.responderChat(pacienteId, request.pergunta())
        );
    }

    @PostMapping("/chat/populacional")
    public ResponseEntity<ChatDinamicoResponse> responderChatPopulacional(
            @Valid @RequestBody ChatDinamicoRequest request
    ) {
        return ResponseEntity.ok(
                orquestrador.responderChatPopulacional(request.pergunta())
        );
    }
}
