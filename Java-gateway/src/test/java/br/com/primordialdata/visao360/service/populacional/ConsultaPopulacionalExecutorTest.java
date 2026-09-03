package br.com.primordialdata.visao360.service.populacional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.com.primordialdata.visao360.domain.repository.PopulacionalRepository;
import br.com.primordialdata.visao360.service.populacional.dto.PlanoConsultaPopulacional;
import br.com.primordialdata.visao360.tenant.TenantContext;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ConsultaPopulacionalExecutorTest {

    private static final UUID CLINICA = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Mock
    private PopulacionalRepository repository;

    @InjectMocks
    private ConsultaPopulacionalExecutor executor;

    @BeforeEach
    void configurarTenant() {
        TenantContext.setClinicId(CLINICA);
    }

    @AfterEach
    void limparTenant() {
        TenantContext.clear();
    }

    @Test
    void contaSomentePacientesDaClinicaInformada() {
        when(repository.contarPacientes(CLINICA)).thenReturn(23L);

        var resultado = executor.executar(
                CLINICA,
                new PlanoConsultaPopulacional(FerramentaPopulacional.CONTAR_PACIENTES, null)
        );

        assertThat(resultado.valor()).isEqualByComparingTo(BigDecimal.valueOf(23));
        assertThat(resultado.registrosConsiderados()).isEqualTo(23);
        assertThat(resultado.categorias()).isEmpty();
        verify(repository).contarPacientes(CLINICA);
    }

    @Test
    void calculaMediaComDuasCasasDecimais() {
        when(repository.contarPacientes(CLINICA)).thenReturn(12L);
        when(repository.calcularIdadeMedia(CLINICA)).thenReturn(42.126D);

        var resultado = executor.executar(
                CLINICA,
                new PlanoConsultaPopulacional(FerramentaPopulacional.CALCULAR_IDADE_MEDIA, null)
        );

        assertThat(resultado.valor()).isEqualByComparingTo("42.13");
        assertThat(resultado.unidade()).isEqualTo("anos");
    }

    @Test
    void contaPacientesPorSexoSemExporGruposPequenos() {
        when(repository.contarPacientesPorSexo(CLINICA)).thenReturn(List.of(
                sexo("M", 34),
                sexo("F", 29),
                sexo("OUTRO", 1)
        ));
        when(repository.contarPacientes(CLINICA)).thenReturn(64L);

        var resultado = executor.executar(
                CLINICA,
                new PlanoConsultaPopulacional(
                        FerramentaPopulacional.CONTAR_PACIENTES_POR_SEXO,
                        null
                )
        );

        assertThat(resultado.categorias())
                .extracting(item -> item.categoria() + ":" + item.quantidade())
                .containsExactly("MASCULINO:34", "FEMININO:29");
        assertThat(resultado.dadosSuprimidos()).isTrue();
        assertThat(resultado.registrosConsiderados()).isEqualTo(64);
    }

    @Test
    void limitaDiagnosticosESuprimeGruposPequenos() {
        when(repository.listarDiagnosticosMaisComuns(
                CLINICA,
                PageRequest.of(0, ConsultaPopulacionalExecutor.LIMITE_MAXIMO_DIAGNOSTICOS)
        )).thenReturn(List.of(
                diagnostico("Hipertensão arterial", 18),
                diagnostico("Diabetes mellitus", 9),
                diagnostico("Doença rara", 1)
        ));
        when(repository.contarPacientes(CLINICA)).thenReturn(30L);

        var resultado = executor.executar(
                CLINICA,
                new PlanoConsultaPopulacional(FerramentaPopulacional.LISTAR_DIAGNOSTICOS_MAIS_COMUNS, 1)
        );

        assertThat(resultado.categorias()).hasSize(1);
        assertThat(resultado.categorias().getFirst().categoria()).isEqualTo("Hipertensão arterial");
        assertThat(resultado.dadosSuprimidos()).isTrue();
        assertThat(resultado.registrosConsiderados()).isEqualTo(30);
    }

    @Test
    void rejeitaLimiteAcimaDoMaximoSemConsultarBanco() {
        var plano = new PlanoConsultaPopulacional(
                FerramentaPopulacional.LISTAR_DIAGNOSTICOS_MAIS_COMUNS,
                51
        );

        assertThatThrownBy(() -> executor.executar(CLINICA, plano))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("entre 1 e 50");

        verify(repository, never()).listarDiagnosticosMaisComuns(
                CLINICA,
                PageRequest.of(0, 50)
        );
    }

    @Test
    void rejeitaClinicaDiferenteDoTenantAntesDeConsultarBanco() {
        UUID outraClinica = UUID.fromString("22222222-2222-2222-2222-222222222222");
        var plano = new PlanoConsultaPopulacional(FerramentaPopulacional.CONTAR_PACIENTES, null);

        assertThatThrownBy(() -> executor.executar(outraClinica, plano))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("diverge do tenant autenticado");

        verifyNoInteractions(repository);
    }

    private PopulacionalRepository.DiagnosticoQuantidade diagnostico(String categoria, long quantidade) {
        return new PopulacionalRepository.DiagnosticoQuantidade() {
            @Override
            public String getCategoria() {
                return categoria;
            }

            @Override
            public long getQuantidade() {
                return quantidade;
            }
        };
    }

    private PopulacionalRepository.SexoQuantidade sexo(String categoria, long quantidade) {
        return new PopulacionalRepository.SexoQuantidade() {
            @Override
            public String getCategoria() {
                return categoria;
            }

            @Override
            public long getQuantidade() {
                return quantidade;
            }
        };
    }
}
