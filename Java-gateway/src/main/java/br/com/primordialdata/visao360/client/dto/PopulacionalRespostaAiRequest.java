package br.com.primordialdata.visao360.client.dto;

import br.com.primordialdata.visao360.service.populacional.FerramentaPopulacional;
import br.com.primordialdata.visao360.service.populacional.dto.ResultadoAgregado;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record PopulacionalRespostaAiRequest(
        @JsonProperty("clinic_id") UUID clinicId,
        @JsonProperty("lgpd_nivel") String lgpdNivel,
        String pergunta,
        @JsonProperty("resultado_agregado") ResultadoAgregadoAi resultadoAgregado
) {
    public static PopulacionalRespostaAiRequest from(
            UUID clinicId,
            String pergunta,
            ResultadoAgregado resultado
    ) {
        List<CategoriaAgregadaAi> categorias = resultado.categorias().stream()
                .map(item -> new CategoriaAgregadaAi(item.categoria(), item.quantidade()))
                .toList();
        return new PopulacionalRespostaAiRequest(
                clinicId,
                "pseudonimizado",
                pergunta,
                new ResultadoAgregadoAi(
                        resultado.ferramenta(),
                        resultado.valor(),
                        resultado.unidade(),
                        resultado.registrosConsiderados(),
                        categorias,
                        resultado.dadosSuprimidos()
                )
        );
    }

    public record ResultadoAgregadoAi(
            FerramentaPopulacional ferramenta,
            BigDecimal valor,
            String unidade,
            @JsonProperty("registros_considerados") long registrosConsiderados,
            List<CategoriaAgregadaAi> categorias,
            @JsonProperty("dados_suprimidos") boolean dadosSuprimidos
    ) {
    }

    public record CategoriaAgregadaAi(
            String categoria,
            long quantidade
    ) {
    }
}
