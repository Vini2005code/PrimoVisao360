package br.com.primordialdata.visao360.controller;

import br.com.primordialdata.visao360.service.orquestration.Visao360Orquestrador;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/visao360")
public class Visao360Controller {

    private final Visao360Orquestrador orquestrador;

    public Visao360Controller(Visao360Orquestrador orquestrador) {
        this.orquestrador = orquestrador;
    }

    @PostMapping("/insights")
    public ResponseEntity<String> gerarInsights(@RequestBody RequestPayload payload) {
        
        // O cabeçalho HTTP "X-Clinic-ID" já foi interceptado e processado pelo TenantFilter.
        // A execução é repassada diretamente ao orquestrador.
        String resultado = orquestrador.gerarInsights(payload.pacienteId());
        
        return ResponseEntity.ok(resultado);
    }

    // Estrutura de Transferência de Dados (DTO) para mapear o JSON enviado pelo React.
    public record RequestPayload(String pacienteId) {}
}