package br.com.primordialdata.visao360.service.populacional.dto;

import java.util.Objects;

public record CategoriaAgregada(
        String categoria,
        long quantidade
) {
    public CategoriaAgregada {
        categoria = Objects.requireNonNull(categoria, "A categoria é obrigatória.").trim();
        if (categoria.isBlank()) {
            throw new IllegalArgumentException("A categoria não pode ser vazia.");
        }
        if (quantidade < 0) {
            throw new IllegalArgumentException("A quantidade não pode ser negativa.");
        }
    }
}
