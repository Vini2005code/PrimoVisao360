package br.com.primordialdata.visao360.config;

import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Profile("postgres")
public class PostgresContractVerifier implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(PostgresContractVerifier.class);
    private static final Pattern SAFE_SCHEMA = Pattern.compile("[a-z_][a-z0-9_]{0,62}");
    private static final List<String> REQUIRED_RELATIONS = List.of(
            "prontuario_paciente",
            "visao360_insight",
            "visao360_patient_tenant"
    );

    private final JdbcTemplate jdbcTemplate;
    private final String schema;
    private final boolean requireSafeRole;

    public PostgresContractVerifier(
            DataSource dataSource,
            @Value("${app.database.schema}") String schema,
            @Value("${app.database.require-safe-role:true}") boolean requireSafeRole
    ) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
        this.schema = schema;
        this.requireSafeRole = requireSafeRole;
    }

    @Override
    public void run(ApplicationArguments args) {
        validateSchema();
        validateRequiredRelations();
        validateInsightRls();
        validateTenantCardinality();
        validateDatabaseRole();
        String database = jdbcTemplate.queryForObject("select current_database()", String.class);
        LOGGER.info("postgres_contract_validated database={} schema={}", database, schema);
    }

    private void validateRequiredRelations() {
        for (String relation : REQUIRED_RELATIONS) {
            Integer count = jdbcTemplate.queryForObject(
                    """
                    select count(*)
                    from pg_class c
                    join pg_namespace n on n.oid = c.relnamespace
                    where n.nspname = ? and c.relname = ?
                    """,
                    Integer.class,
                    schema,
                    relation
            );
            if (count == null || count != 1) {
                throw new IllegalStateException(
                        "Contrato PostgreSQL ausente: " + schema + "." + relation
                                + ". Execute db/postgres-ehr-teste-bridge.sql com o usuário proprietário."
                );
            }
        }
    }

    private void validateInsightRls() {
        Boolean protectedByRls = jdbcTemplate.queryForObject(
                """
                select c.relrowsecurity and c.relforcerowsecurity
                from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = ? and c.relname = 'visao360_insight'
                """,
                Boolean.class,
                schema
        );
        if (!Boolean.TRUE.equals(protectedByRls)) {
            throw new IllegalStateException("RLS obrigatório não está ativo e forçado em visao360_insight.");
        }
    }

    private void validateTenantCardinality() {
        String quotedSchema = "\"" + schema + "\"";
        Long sharedPatients = jdbcTemplate.queryForObject(
                "select count(*) from (select paciente_id from " + quotedSchema
                        + ".atendimento group by paciente_id having count(distinct clinica_id) > 1) shared",
                Long.class
        );
        if (sharedPatients != null && sharedPatients > 0) {
            throw new IllegalStateException(
                    "Há pacientes vinculados a múltiplas clínicas. O schema deve receber clinic_id "
                            + "nas tabelas clínicas antes de liberar o Gateway."
            );
        }
    }

    private void validateDatabaseRole() {
        Map<String, Object> role = jdbcTemplate.queryForMap(
                "select current_user as role_name, rolsuper, rolbypassrls "
                        + "from pg_roles where rolname = current_user"
        );
        boolean privileged = Boolean.TRUE.equals(role.get("rolsuper"))
                || Boolean.TRUE.equals(role.get("rolbypassrls"));
        if (requireSafeRole && privileged) {
            throw new IllegalStateException(
                    "O usuário PostgreSQL do Gateway não pode ser superuser nem possuir BYPASSRLS."
            );
        }
        if (privileged) {
            LOGGER.warn("postgres_privileged_role_allowed_only_for_local_validation role={}", role.get("role_name"));
        }
    }

    private void validateSchema() {
        if (schema == null || !SAFE_SCHEMA.matcher(schema).matches()) {
            throw new IllegalStateException("DB_SCHEMA possui identificador inválido.");
        }
    }
}
