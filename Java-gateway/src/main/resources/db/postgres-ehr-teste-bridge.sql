-- Ponte aditiva entre o schema clínico existente e o Gateway Visão 360.
-- Executar uma única vez com o proprietário do schema. Não remove nem altera
-- registros clínicos existentes.

SET search_path TO ehr_teste, public;

CREATE TABLE IF NOT EXISTS visao360_clinic_tenant (
    clinic_id INTEGER PRIMARY KEY REFERENCES clinica (id) ON DELETE RESTRICT,
    clinic_public_id UUID NOT NULL UNIQUE,
    UNIQUE (clinic_id, clinic_public_id)
);

INSERT INTO visao360_clinic_tenant (clinic_id, clinic_public_id)
SELECT id, (
    substr(md5('primordial-clinic-v1:' || id::text), 1, 8) || '-'
    || substr(md5('primordial-clinic-v1:' || id::text), 9, 4) || '-5'
    || substr(md5('primordial-clinic-v1:' || id::text), 14, 3) || '-a'
    || substr(md5('primordial-clinic-v1:' || id::text), 18, 3) || '-'
    || substr(md5('primordial-clinic-v1:' || id::text), 21, 12)
)::uuid
FROM clinica
ON CONFLICT (clinic_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS visao360_patient_tenant (
    clinic_id INTEGER NOT NULL REFERENCES clinica (id) ON DELETE RESTRICT,
    patient_id INTEGER NOT NULL REFERENCES paciente (id) ON DELETE RESTRICT,
    clinic_public_id UUID NOT NULL,
    paciente_public_id UUID NOT NULL,
    PRIMARY KEY (clinic_id, patient_id),
    UNIQUE (clinic_public_id, paciente_public_id),
    FOREIGN KEY (clinic_id, clinic_public_id)
        REFERENCES visao360_clinic_tenant (clinic_id, clinic_public_id)
        ON DELETE RESTRICT
);

INSERT INTO visao360_patient_tenant (
    clinic_id,
    patient_id,
    clinic_public_id,
    paciente_public_id
)
SELECT DISTINCT
    atendimento.clinica_id,
    atendimento.paciente_id,
    tenant.clinic_public_id,
    (
        substr(md5('primordial-patient-v1:' || atendimento.clinica_id::text || ':' || atendimento.paciente_id::text), 1, 8) || '-'
        || substr(md5('primordial-patient-v1:' || atendimento.clinica_id::text || ':' || atendimento.paciente_id::text), 9, 4) || '-5'
        || substr(md5('primordial-patient-v1:' || atendimento.clinica_id::text || ':' || atendimento.paciente_id::text), 14, 3) || '-a'
        || substr(md5('primordial-patient-v1:' || atendimento.clinica_id::text || ':' || atendimento.paciente_id::text), 18, 3) || '-'
        || substr(md5('primordial-patient-v1:' || atendimento.clinica_id::text || ':' || atendimento.paciente_id::text), 21, 12)
    )::uuid
FROM atendimento
JOIN visao360_clinic_tenant tenant
  ON tenant.clinic_id = atendimento.clinica_id
ON CONFLICT (clinic_id, patient_id) DO NOTHING;

CREATE OR REPLACE VIEW prontuario_paciente
WITH (security_barrier = true)
AS
SELECT
    tenant.paciente_public_id AS id,
    tenant.clinic_public_id AS clinic_id,
    tenant.paciente_public_id AS paciente_id,
    paciente.nome_completo AS nome_paciente,
    EXTRACT(YEAR FROM age(current_date, paciente.data_nascimento))::integer AS idade,
    paciente.sexo_biologico AS sexo,
    CASE WHEN paciente.ativo THEN 'ativo' ELSE 'inativo' END AS status,
    LEFT(COALESCE((
        SELECT string_agg(
            diagnostico.nome_diagnostico || ' [' || diagnostico.status || ']',
            '; ' ORDER BY diagnostico.principal DESC, diagnostico.data_diagnostico DESC NULLS LAST
        )
        FROM paciente_diagnostico diagnostico
        WHERE diagnostico.paciente_id = paciente.id
    ), 'Sem diagnóstico registrado'), 500) AS diagnostico,
    LEFT(concat_ws(E'\n',
        'ATENDIMENTOS: ' || COALESCE((
            SELECT string_agg(
                concat_ws(' | ',
                    atendimento.data_hora::text,
                    atendimento.tipo_atendimento,
                    atendimento.motivo_consulta,
                    atendimento.resumo_clinico,
                    atendimento.texto_original_capturado
                ),
                E'\n' ORDER BY atendimento.data_hora
            )
            FROM atendimento
            WHERE atendimento.paciente_id = paciente.id
              AND atendimento.clinica_id = tenant.clinic_id
        ), 'Sem registros'),
        'EXAMES: ' || COALESCE((
            SELECT string_agg(
                concat_ws(' | ',
                    exame.data_coleta::text,
                    exame.nome_exame,
                    exame.resultado_numerico::text,
                    exame.resultado_texto,
                    exame.unidade,
                    exame.valor_referencia,
                    exame.interpretacao,
                    exame.observacao
                ),
                E'\n' ORDER BY exame.data_coleta
            )
            FROM exame_laboratorial exame
            WHERE exame.paciente_id = paciente.id
              AND (
                  exame.atendimento_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM atendimento atendimento_exame
                      WHERE atendimento_exame.id = exame.atendimento_id
                        AND atendimento_exame.clinica_id = tenant.clinic_id
                  )
              )
        ), 'Sem registros'),
        'SINAIS VITAIS: ' || COALESCE((
            SELECT string_agg(
                concat_ws(' | ',
                    sinal.data_hora::text,
                    'PA=' || sinal.pa_sistolica::text || '/' || sinal.pa_diastolica::text,
                    'FC=' || sinal.frequencia_cardiaca::text,
                    'SpO2=' || sinal.saturacao_o2::text,
                    'T=' || sinal.temperatura_c::text,
                    'Peso=' || sinal.peso_kg::text,
                    'IMC=' || sinal.imc::text,
                    sinal.observacao
                ),
                E'\n' ORDER BY sinal.data_hora
            )
            FROM sinal_vital sinal
            WHERE sinal.paciente_id = paciente.id
              AND (
                  sinal.atendimento_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM atendimento atendimento_sinal
                      WHERE atendimento_sinal.id = sinal.atendimento_id
                        AND atendimento_sinal.clinica_id = tenant.clinic_id
                  )
              )
        ), 'Sem registros'),
        'ALERGIAS: ' || COALESCE((
            SELECT string_agg(
                concat_ws(' | ', alergia.substancia, alergia.tipo_reacao,
                    alergia.gravidade, alergia.status, alergia.observacao),
                E'\n' ORDER BY alergia.id
            )
            FROM alergia
            WHERE alergia.paciente_id = paciente.id
        ), 'Sem registros'),
        'MEDICAMENTOS: ' || COALESCE((
            SELECT string_agg(
                concat_ws(' | ', medicamento.medicamento_padronizado_catalogo,
                    medicamento.nome_informado_original,
                    medicamento.forca_concentracao_produto,
                    medicamento.dose_por_administracao,
                    medicamento.via_administracao,
                    medicamento.frequencia_intervalo,
                    medicamento.situacao_uso,
                    medicamento.observacao_medicamento),
                E'\n' ORDER BY medicamento.id
            )
            FROM medicamento_em_uso medicamento
            WHERE medicamento.paciente_id = paciente.id
              AND (
                  medicamento.atendimento_id IS NULL
                  OR EXISTS (
                      SELECT 1
                      FROM atendimento atendimento_medicamento
                      WHERE atendimento_medicamento.id = medicamento.atendimento_id
                        AND atendimento_medicamento.clinica_id = tenant.clinic_id
                  )
              )
        ), 'Sem registros')
    ), 100000) AS historico_clinico,
    COALESCE((
        SELECT max(atendimento.data_hora)::date
        FROM atendimento
        WHERE atendimento.paciente_id = paciente.id
          AND atendimento.clinica_id = tenant.clinic_id
    ), paciente.criado_em::date) AS atualizado_em
FROM visao360_patient_tenant tenant
JOIN paciente ON paciente.id = tenant.patient_id
WHERE tenant.clinic_public_id = NULLIF(
    current_setting('app.current_clinic_id', true),
    ''
)::uuid;

CREATE TABLE IF NOT EXISTS visao360_insight (
    id UUID PRIMARY KEY,
    clinic_id UUID NOT NULL,
    prontuario_id UUID NOT NULL,
    token_paciente VARCHAR(80) NOT NULL,
    resumo_executivo TEXT NOT NULL,
    alertas_criticos_json TEXT NOT NULL,
    tendencias_json TEXT NOT NULL,
    status_processamento VARCHAR(32) NOT NULL,
    gerado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_visao360_insight_status CHECK (status_processamento = 'sucesso'),
    CONSTRAINT fk_visao360_insight_patient_tenant
        FOREIGN KEY (clinic_id, prontuario_id)
        REFERENCES visao360_patient_tenant (clinic_public_id, paciente_public_id)
        ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_visao360_insight_clinica_prontuario_data
    ON visao360_insight (clinic_id, prontuario_id, gerado_em DESC);

ALTER TABLE visao360_insight ENABLE ROW LEVEL SECURITY;
ALTER TABLE visao360_insight FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visao360_insight_select_por_clinica ON visao360_insight;
CREATE POLICY visao360_insight_select_por_clinica
    ON visao360_insight
    FOR SELECT
    USING (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::uuid
    );

DROP POLICY IF EXISTS visao360_insight_insert_por_clinica ON visao360_insight;
CREATE POLICY visao360_insight_insert_por_clinica
    ON visao360_insight
    FOR INSERT
    WITH CHECK (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::uuid
    );

DROP POLICY IF EXISTS visao360_insight_delete_por_clinica ON visao360_insight;
CREATE POLICY visao360_insight_delete_por_clinica
    ON visao360_insight
    FOR DELETE
    USING (
        clinic_id = NULLIF(current_setting('app.current_clinic_id', true), '')::uuid
    );

REVOKE ALL ON TABLE visao360_clinic_tenant FROM PUBLIC;
REVOKE ALL ON TABLE visao360_patient_tenant FROM PUBLIC;
REVOKE ALL ON TABLE prontuario_paciente FROM PUBLIC;
REVOKE ALL ON TABLE visao360_insight FROM PUBLIC;

-- Execute os GRANTs abaixo somente depois de criar uma role sem SUPERUSER e sem BYPASSRLS:
-- GRANT USAGE ON SCHEMA ehr_teste TO primordial_app;
-- GRANT SELECT ON TABLE ehr_teste.prontuario_paciente TO primordial_app;
-- GRANT SELECT, INSERT, DELETE ON TABLE ehr_teste.visao360_insight TO primordial_app;
