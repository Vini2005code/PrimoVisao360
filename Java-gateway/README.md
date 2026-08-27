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

Preencha variáveis equivalentes às de `.env.example` e ative o perfil:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'postgres'
.\mvnw.cmd spring-boot:run
```

É necessário ter uma JDK 21 configurada em `JAVA_HOME`. O Maven global não é obrigatório, pois o projeto inclui o Maven Wrapper.

Nesse perfil:

- `ddl-auto=validate`: o gateway não cria nem altera o schema gerenciado pela outra equipe.
- `RlsAspect` abre a transação, chama `set_config(..., true)` com parâmetro e executa a consulta no mesmo escopo transacional.
- A consulta também filtra `clinic_id` explicitamente como defesa em profundidade.
- O payload enviado ao FastAPI segue o contrato estrito de `/ai/gerar-visao-360` e usa `X-Internal-API-Key`.
- O nome real e padrões comuns de CPF, e-mail, telefone e CEP são removidos antes da chamada externa.
- Cada resposta válida é persistida em `visao360_insight` ainda pseudonimizada e vinculada ao prontuário e à clínica.
- O histórico é reidentificado somente na resposta do gateway, após as validações de tenant e RLS.
- O conteúdo persistido não possui operação de atualização; a remoção ocorre somente por `DELETE` explícito.

Os arquivos `src/main/resources/db/rls-example.sql` e `src/main/resources/db/visao360-insight-history.sql` são referências para a equipe do banco; eles não rodam automaticamente. O usuário PostgreSQL da aplicação não pode ser superuser, proprietário da tabela ou possuir `BYPASSRLS`.

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
