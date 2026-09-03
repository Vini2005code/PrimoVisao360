# Primordial Inteligência 360

Aplicação interna com gateway Java, FastAPI e PostgreSQL. O chat clínico é
orquestrado pelo gateway Java: o FastAPI recebe somente a pergunta e o contexto
autorizado já pseudonimizados e nunca consulta o banco para responder ao chat.

## Configuração

Copie `.env.example` para `.env` e ajuste somente os segredos e endereços do
seu ambiente:

```env
APP_ENV=development
SPRING_PROFILES_ACTIVE=mvp
DATABASE_ENABLED=false
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/Primordial_Interno
DB_SCHEMA=ehr_teste
INTERNAL_API_KEY=substitua-por-um-segredo-com-32-caracteres
GROQ_API_KEY=gsk_substitua_por_um_segredo_real
VOICE_ENABLED=true
VOICE_MOCK_ENABLED=true
```

O `DATABASE_URL` nunca deve ser colocado no frontend ou versionado. O `.env`
está ignorado pelo Git. Para produção, use uma credencial PostgreSQL exclusiva
com permissões de leitura e TLS.

## Como rodar backend e frontend

Um único comando inicia o FastAPI, serve a interface e abre o navegador:

```powershell
.\iniciar-local.cmd
```

Alternativa sem abrir o navegador:

```powershell
.\.venv\Scripts\python.exe run_local.py --no-browser --no-reload
```

Acesse:

- Interface React: `http://127.0.0.1:5173/`
- Interface HTML incorporada: `http://127.0.0.1:8000/`
- Swagger: `http://127.0.0.1:8000/docs`
- Readiness: `http://127.0.0.1:8000/ready`

O inicializador Python sobe Java, Vite e FastAPI no mesmo terminal e encerra os
três com o mesmo `Ctrl+C`. Use `--no-java` ou `--no-frontend` para omitir uma
camada durante o desenvolvimento.

## Testar os serviços

```powershell
Invoke-RestMethod http://127.0.0.1:8080/actuator/health
Invoke-RestMethod http://127.0.0.1:8000/health
```

Resposta esperada:

```json
{"status":"UP"}
```

## Testar o chat dinâmico pelo gateway Java

```powershell
$pacienteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
$body = @{ pergunta = "Qual é a situação clínica registrada?" } | ConvertTo-Json
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8080/api/v1/visao360/pacientes/$pacienteId/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

A rota legada `POST /chat` do FastAPI está desativada. O endpoint interno
`POST /ai/chat-dinamico` exige `X-Internal-API-Key` e deve ser chamado
somente pelo gateway Java.

## Proteções do chat

- autenticação e tenant resolvidos no gateway Java;
- leitura do prontuário e dos insights sob RLS;
- pseudonimização da pergunta, evoluções e insights antes da chamada HTTP;
- exclusão de `clinic_id` e `lgpd_nivel` antes da fronteira do Groq;
- validação Pydantic Fail Fast de chaves e padrões de PII;
- resposta estruturada e validada antes da reidentificação;
- nenhuma geração de SQL pelo modelo;
- perguntas e conteúdo clínico não são registrados nos logs.

## Conversa por voz no MVP

O React continua usando `MediaRecorder` e `/voice/ws`, mas o perfil MVP ignora
o conteúdo do áudio e devolve uma transcrição e um WAV silencioso gerados em
memória. Nenhum modelo é carregado e nenhum áudio é persistido ou enviado.

```env
VOICE_ENABLED=true
VOICE_MOCK_ENABLED=true
```

Para desenvolver futuramente a voz local real, instale as dependências
opcionais e defina `VOICE_MOCK_ENABLED=false`:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-voice.txt
.\.venv\Scripts\python.exe -c "from faster_whisper.utils import download_model; download_model('base', output_dir='models/faster-whisper-base')"
.\.venv\Scripts\python.exe -m piper.download_voices --data-dir models pt_BR-faber-medium
```

Áudio clínico nunca é escrito em arquivo, log ou PostgreSQL.

Smoke test completo sem microfone e com uma frase sintética não clínica:

```powershell
.\.venv\Scripts\python.exe -m scripts.voice_smoke
```

## Testes automatizados

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
cd Java-gateway
.\mvnw.cmd test
cd ..\primordial-frontend-main
npm.cmd run build
```

Os testes verificam os contratos, as seis intenções, o bloqueio de SQL
destrutivo, a ocultação do `DATABASE_URL`, a API de IA pseudonimizada e a
remoção do bootstrap demonstrativo.
