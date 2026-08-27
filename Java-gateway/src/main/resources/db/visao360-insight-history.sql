-- DDL de referência. Executar pelo usuário proprietário do schema.
-- O gateway utiliza ddl-auto=validate e não executa este arquivo automaticamente.

CREATE UNIQUE INDEX IF NOT EXISTS uq_prontuario_paciente_id_clinica
    ON prontuario_paciente (id, clinic_id);

CREATE TABLE visao360_insight (
    id UUID PRIMARY KEY,
    clinic_id UUID NOT NULL,
    prontuario_id UUID NOT NULL,
    token_paciente VARCHAR(80) NOT NULL,
    resumo_executivo TEXT NOT NULL,
    alertas_criticos_json TEXT NOT NULL,
    tendencias_json TEXT NOT NULL,
    status_processamento VARCHAR(32) NOT NULL,
    gerado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_visao360_insight_status
        CHECK (status_processamento = 'sucesso'),
    CONSTRAINT fk_visao360_insight_prontuario_tenant
        FOREIGN KEY (prontuario_id, clinic_id)
        REFERENCES prontuario_paciente (id, clinic_id)
        ON DELETE RESTRICT
);

CREATE INDEX idx_visao360_insight_clinica_prontuario_data
    ON visao360_insight (clinic_id, prontuario_id, gerado_em DESC);

ALTER TABLE visao360_insight ENABLE ROW LEVEL SECURITY;
ALTER TABLE visao360_insight FORCE ROW LEVEL SECURITY;

CREATE POLICY visao360_insight_select_por_clinica
    ON visao360_insight
    FOR SELECT
    TO primordial_app
    USING (
        clinic_id = NULLIF(
            current_setting('app.current_clinic_id', true),
            ''
        )::uuid
    );

CREATE POLICY visao360_insight_insert_por_clinica
    ON visao360_insight
    FOR INSERT
    TO primordial_app
    WITH CHECK (
        clinic_id = NULLIF(
            current_setting('app.current_clinic_id', true),
            ''
        )::uuid
    );

CREATE POLICY visao360_insight_delete_por_clinica
    ON visao360_insight
    FOR DELETE
    TO primordial_app
    USING (
        clinic_id = NULLIF(
            current_setting('app.current_clinic_id', true),
            ''
        )::uuid
    );

GRANT SELECT, INSERT, DELETE ON TABLE visao360_insight TO primordial_app;
REVOKE UPDATE ON TABLE visao360_insight FROM primordial_app;
