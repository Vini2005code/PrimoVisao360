package br.com.primordialdata.visao360.config;

import br.com.primordialdata.visao360.domain.entity.ProntuarioPaciente;
import br.com.primordialdata.visao360.domain.repository.ProntuarioPacienteRepository;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("local")
public class LocalDemoDataConfiguration {

    public static final UUID CLINICA_A = UUID.fromString("11111111-1111-4111-8111-111111111111");
    public static final UUID CLINICA_B = UUID.fromString("22222222-2222-4222-8222-222222222222");
    public static final UUID PACIENTE_A = UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    @Bean
    CommandLineRunner seedLocalData(ProntuarioPacienteRepository repository) {
        return args -> {
            if (repository.findByPacienteIdAndClinicId(PACIENTE_A, CLINICA_A).isEmpty()) {
                repository.save(new ProntuarioPaciente(
                        UUID.fromString("10000000-0000-4000-8000-000000000001"),
                        CLINICA_A,
                        PACIENTE_A,
                        "Paciente Demonstração",
                        42,
                        "M",
                        "ativo",
                        "Hipertensão arterial",
                        "Paciente Demonstração possui registros de pressão arterial em acompanhamento clínico.",
                        LocalDate.of(2026, 8, 20)
                ));
            }
            if (repository.findByPacienteIdAndClinicId(PACIENTE_A, CLINICA_B).isEmpty()) {
                repository.save(new ProntuarioPaciente(
                        UUID.fromString("20000000-0000-4000-8000-000000000002"),
                        CLINICA_B,
                        PACIENTE_A,
                        "Paciente Outra Clínica",
                        37,
                        "F",
                        "ativo",
                        "Diabetes mellitus",
                        "Paciente Outra Clínica possui acompanhamento glicêmico documentado.",
                        LocalDate.of(2026, 8, 21)
                ));
            }
        };
    }
}
