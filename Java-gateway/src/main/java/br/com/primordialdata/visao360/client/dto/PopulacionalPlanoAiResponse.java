package br.com.primordialdata.visao360.client.dto;

import br.com.primordialdata.visao360.service.populacional.FerramentaPopulacional;

public record PopulacionalPlanoAiResponse(
        FerramentaPopulacional ferramenta,
        Integer limite
) {
}
