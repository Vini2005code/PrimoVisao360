# Visão 360 Java Gateway

Gateway Spring Boot 3.5 / Java 21 entre o React, o PostgreSQL clínico e o Motor de IA FastAPI.

## Execução local com FastAPI real

O perfil padrão é `local`: usa H2 em memória, cria duas clínicas simuladas e chama o FastAPI configurado por `AI_SERVICE_BASE_URL`. O adaptador de resposta fixa não participa do fluxo normal.

```powershell
.\mvnw.cmd spring-boot:run
```

Teste manual:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8080/api/v1/visao360/insights `
  -Headers @{ 'X-Clinic-ID' = '11111111-1111-4111-8111-111111111111' } `
  -ContentType 'application/json' `
  -Body '{"paciente_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}'
```

Health check: `GET http://127.0.0.1:8080/actuator/health`.

O perfil `stub` existe exclusivamente para testes automatizados sem dependência de rede:

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local,stub"
```

## PostgreSQL e FastAPI

O Gateway aceita a mesma `DATABASE_URL=postgresql://...` utilizada pelo Python e a
converte internamente para JDBC sem registrar usuário ou senha. Antes da primeira
execução, o proprietário do schema deve aplicar o contrato aditivo:

```powershell
psql -d Primordial_Interno -f src/main/resources/db/postgres-ehr-teste-bridge.sql
```

Esse script não altera as tabelas clínicas atuais. Ele cria mapeamentos UUID
externos, a visão restrita `prontuario_paciente`, a tabela persistente
`visao360_insight` e suas políticas RLS.

Crie uma role exclusiva, sem `SUPERUSER`, sem `BYPASSRLS` e que não seja
proprietária das tabelas. Conceda somente:

```sql
GRANT CONNECT ON DATABASE "Primordial_Interno" TO primordial_app;
GRANT USAGE ON SCHEMA ehr_teste TO primordial_app;
GRANT SELECT ON TABLE ehr_teste.prontuario_paciente TO primordial_app;
GRANT SELECT, INSERT, DELETE ON TABLE ehr_teste.visao360_insight TO primordial_app;
```

Preencha as variáveis de `.env.example`. O Spring importa automaticamente o
`.env` da raiz do projeto ou um `.env` dentro de `Java-gateway`. Ative o perfil:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'postgres'
.\mvnw.cmd spring-boot:run
```

É necessário ter uma JDK 21 configurada em `JAVA_HOME`. O Maven global não é obrigatório, pois o projeto inclui o Maven Wrapper.

Nesse perfil:

- `DATABASE_URL` pode usar `postgresql://`, `postgres://` ou `jdbc:postgresql://`.
- `DB_SCHEMA=ehr_teste` define explicitamente o schema clínico.
- `ddl-auto=none`: o gateway nunca cria nem altera objetos do PostgreSQL na inicialização.
- Um verificador Fail Fast confirma as relações obrigatórias, o RLS forçado, a
  ausência de pacientes compartilhados entre clínicas e uma role sem privilégios
  capazes de ignorar RLS.
- `RlsAspect` abre a transação, chama `set_config(..., true)` com parâmetro e executa a consulta no mesmo escopo transacional.
- A consulta também filtra `clinic_id` explicitamente como defesa em profundidade.
- O payload enviado ao FastAPI segue o contrato estrito de `/ai/gerar-visao-360` e usa `X-Internal-API-Key`.
- O nome real e padrões comuns de CPF, e-mail, telefone e CEP são removidos antes da chamada externa.
- Cada resposta válida é persistida em `visao360_insight` ainda pseudonimizada e vinculada ao prontuário e à clínica.
- O histórico é reidentificado somente na resposta do gateway, após as validações de tenant e RLS.
- O conteúdo persistido não possui operação de atualização; a remoção ocorre somente por `DELETE` explícito.

O contrato atual do banco está em
`src/main/resources/db/postgres-ehr-teste-bridge.sql` e não roda automaticamente.
`DATABASE_REQUIRE_SAFE_ROLE=false` existe apenas para diagnóstico local temporário;
produção deve manter o valor `true`.

## Histórico de insights

```text
POST   /api/v1/visao360/insights
GET    /api/v1/visao360/pacientes/{pacienteId}/insights
DELETE /api/v1/visao360/insights/{insightId}
POST   /api/v1/visao360/pacientes/{pacienteId}/chat
```

Todos os endpoints exigem `X-Clinic-ID`. A geração salva o insight antes de retorná-lo. A listagem é ordenada de forma decrescente por `gerado_em`. O `DELETE` remove somente um insight pertencente à clínica ativa e retorna `204`.

O endpoint de chat carrega o prontuário e os insights persistidos sob RLS,
pseudonimiza a pergunta e o contexto com um único token efêmero, envia o
contrato seguro para `POST /ai/chat-dinamico` e reidentifica somente a resposta
devolvida ao frontend.

## Fronteira de confiança

`X-Clinic-ID` é aceito apenas para desenvolvimento e integração inicial. Em produção, um filtro de autenticação deve extrair o `clinic_id` de um JWT validado ou de uma sessão confiável e ignorar qualquer tenant informado diretamente pelo navegador.
