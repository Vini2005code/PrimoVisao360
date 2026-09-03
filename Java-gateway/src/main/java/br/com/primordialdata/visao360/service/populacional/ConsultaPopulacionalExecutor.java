package br.com.primordialdata.visao360.service.populacional;

import br.com.primordialdata.visao360.domain.repository.PopulacionalRepository;
import br.com.primordialdata.visao360.service.populacional.dto.CategoriaAgregada;
import br.com.primordialdata.visao360.service.populacional.dto.PlanoConsultaPopulacional;
import br.com.primordialdata.visao360.service.populacional.dto.ResultadoAgregado;
import br.com.primordialdata.visao360.tenant.TenantContext;
import br.com.primordialdata.visao360.tenant.rls.ClinicRls;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class ConsultaPopulacionalExecutor {

    static final int LIMITE_PADRAO_DIAGNOSTICOS = 10;
    static final int LIMITE_MAXIMO_DIAGNOSTICOS = 50;
    static final long TAMANHO_MINIMO_GRUPO = 5;

    private final PopulacionalRepository repository;

    public ConsultaPopulacionalExecutor(PopulacionalRepository repository) {
        this.repository = repository;
    }

    /**
     * Executa exclusivamente uma ferramenta previamente enumerada, dentro da transação RLS.
     */
    @ClinicRls(readOnly = true)
    public ResultadoAgregado executar(UUID clinicId, PlanoConsultaPopulacional plano) {
        validarEscopoTenant(clinicId);
        Objects.requireNonNull(plano, "O plano de consulta é obrigatório.");

        return switch (plano.ferramenta()) {
            case CONTAR_PACIENTES -> contarPacientes(clinicId, plano.limite());
            case CONTAR_PACIENTES_POR_SEXO -> contarPacientesPorSexo(
                    clinicId,
                    plano.limite()
            );
            case CALCULAR_IDADE_MEDIA -> calcularIdadeMedia(clinicId, plano.limite());
            case LISTAR_DIAGNOSTICOS_MAIS_COMUNS -> listarDiagnosticosMaisComuns(
                    clinicId,
                    validarLimiteDiagnosticos(plano.limite())
            );
        };
    }

    private ResultadoAgregado contarPacientesPorSexo(UUID clinicId, Integer limite) {
        rejeitarLimiteIncompativel(
                limite,
                FerramentaPopulacional.CONTAR_PACIENTES_POR_SEXO
        );
        List<PopulacionalRepository.SexoQuantidade> encontrados =
                repository.contarPacientesPorSexo(clinicId);
        Map<String, Long> consolidados = encontrados.stream().collect(
                Collectors.groupingBy(
                        item -> normalizarSexo(item.getCategoria()),
                        Collectors.summingLong(
                                PopulacionalRepository.SexoQuantidade::getQuantidade
                        )
                )
        );
        boolean houveSupressao = consolidados.values().stream()
                .anyMatch(quantidade -> quantidade < TAMANHO_MINIMO_GRUPO);
        List<CategoriaAgregada> categorias = consolidados.entrySet().stream()
                .filter(item -> item.getValue() >= TAMANHO_MINIMO_GRUPO)
                .sorted(Map.Entry.comparingByValue(Comparator.reverseOrder()))
                .map(item -> new CategoriaAgregada(item.getKey(), item.getValue()))
                .toList();
        long total = repository.contarPacientes(clinicId);
        return new ResultadoAgregado(
                FerramentaPopulacional.CONTAR_PACIENTES_POR_SEXO,
                null,
                "pacientes",
                total,
                categorias,
                houveSupressao
        );
    }

    private ResultadoAgregado contarPacientes(UUID clinicId, Integer limite) {
        rejeitarLimiteIncompativel(limite, FerramentaPopulacional.CONTAR_PACIENTES);
        long total = repository.contarPacientes(clinicId);
        return new ResultadoAgregado(
                FerramentaPopulacional.CONTAR_PACIENTES,
                BigDecimal.valueOf(total),
                "pacientes",
                total,
                List.of(),
                false
        );
    }

    private ResultadoAgregado calcularIdadeMedia(UUID clinicId, Integer limite) {
        rejeitarLimiteIncompativel(limite, FerramentaPopulacional.CALCULAR_IDADE_MEDIA);
        long total = repository.contarPacientes(clinicId);
        Double media = repository.calcularIdadeMedia(clinicId);
        BigDecimal valor = media == null
                ? null
                : BigDecimal.valueOf(media).setScale(2, RoundingMode.HALF_UP);
        return new ResultadoAgregado(
                FerramentaPopulacional.CALCULAR_IDADE_MEDIA,
                valor,
                "anos",
                total,
                List.of(),
                false
        );
    }

    private ResultadoAgregado listarDiagnosticosMaisComuns(UUID clinicId, int limite) {
        List<PopulacionalRepository.DiagnosticoQuantidade> encontrados =
                repository.listarDiagnosticosMaisComuns(
                        clinicId,
                        PageRequest.of(0, LIMITE_MAXIMO_DIAGNOSTICOS)
                );

        boolean houveSupressao = encontrados.stream()
                .anyMatch(item -> item.getQuantidade() < TAMANHO_MINIMO_GRUPO);

        List<CategoriaAgregada> categorias = encontrados.stream()
                .filter(item -> item.getQuantidade() >= TAMANHO_MINIMO_GRUPO)
                .limit(limite)
                .map(item -> new CategoriaAgregada(item.getCategoria(), item.getQuantidade()))
                .toList();

        return new ResultadoAgregado(
                FerramentaPopulacional.LISTAR_DIAGNOSTICOS_MAIS_COMUNS,
                null,
                "pacientes",
                repository.contarPacientes(clinicId),
                categorias,
                houveSupressao
        );
    }

    private void validarEscopoTenant(UUID clinicId) {
        UUID tenantAutenticado = TenantContext.requireClinicId();
        if (!tenantAutenticado.equals(Objects.requireNonNull(clinicId, "O clinicId é obrigatório."))) {
            throw new IllegalStateException("A clínica consultada diverge do tenant autenticado.");
        }
    }

    private int validarLimiteDiagnosticos(Integer limiteSolicitado) {
        int limite = limiteSolicitado == null ? LIMITE_PADRAO_DIAGNOSTICOS : limiteSolicitado;
        if (limite < 1 || limite > LIMITE_MAXIMO_DIAGNOSTICOS) {
            throw new IllegalArgumentException(
                    "O limite de diagnósticos deve estar entre 1 e " + LIMITE_MAXIMO_DIAGNOSTICOS + "."
            );
        }
        return limite;
    }

    private void rejeitarLimiteIncompativel(Integer limite, FerramentaPopulacional ferramenta) {
        if (limite != null) {
            throw new IllegalArgumentException("A ferramenta " + ferramenta + " não aceita o argumento limite.");
        }
    }

    private String normalizarSexo(String valor) {
        if (valor == null || valor.isBlank()) {
            return "NAO_INFORMADO";
        }
        String normalizado = Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toUpperCase(Locale.ROOT);
        return switch (normalizado) {
            case "M", "MASCULINO", "HOMEM", "MALE" -> "MASCULINO";
            case "F", "FEMININO", "MULHER", "FEMALE" -> "FEMININO";
            default -> "OUTRO_OU_NAO_INFORMADO";
        };
    }
}
