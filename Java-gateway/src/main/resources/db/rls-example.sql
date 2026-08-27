-- Exemplo para a equipe responsável pelo PostgreSQL.
-- Não é executado automaticamente pelo gateway.

ALTER TABLE prontuario_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE prontuario_paciente FORCE ROW LEVEL SECURITY;

CREATE POLICY prontuario_paciente_por_clinica
    ON prontuario_paciente
    FOR ALL
    USING (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::uuid
    )
    WITH CHECK (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::uuid
    );

-- O usuário DATABASE_USERNAME da aplicação não pode ser superuser,
-- proprietário da tabela nem possuir BYPASSRLS.
