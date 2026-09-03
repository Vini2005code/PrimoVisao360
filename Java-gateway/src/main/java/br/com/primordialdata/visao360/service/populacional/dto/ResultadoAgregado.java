package br.com.primordialdata.visao360.service.populacional.dto;

import br.com.primordialdata.visao360.service.populacional.FerramentaPopulacional;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

public record ResultadoAgregado(
        FerramentaPopulacional ferramenta,
        BigDecimal valor,
        String unidade,
        long registrosConsiderados,
        List<CategoriaAgregada> categorias,
        boolean dadosSuprimidos
) {
    public ResultadoAgregado {
        Objects.requireNonNull(ferramenta, "A ferramenta populacional é obrigatória.");
        unidade = Objects.requireNonNull(unidade, "A unidade é obrigatória.").trim();
        if (unidade.isBlank()) {
            throw new IllegalArgumentException("A unidade não pode ser vazia.");
        }
        if (registrosConsiderados < 0) {
            throw new IllegalArgumentException("A quantidade de registros não pode ser negativa.");
        }
        categorias = List.copyOf(Objects.requireNonNull(categorias, "As categorias são obrigatórias."));
    }
}
