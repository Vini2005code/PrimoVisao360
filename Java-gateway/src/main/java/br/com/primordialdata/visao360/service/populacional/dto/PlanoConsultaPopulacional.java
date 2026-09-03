package br.com.primordialdata.visao360.service.populacional.dto;

import br.com.primordialdata.visao360.service.populacional.FerramentaPopulacional;
import java.util.Objects;

public record PlanoConsultaPopulacional(
        FerramentaPopulacional ferramenta,
        Integer limite
) {
    public PlanoConsultaPopulacional {
        Objects.requireNonNull(ferramenta, "A ferramenta populacional é obrigatória.");
    }
}
