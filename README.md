# Primordial Inteligência 360

Aplicação interna com FastAPI, PostgreSQL e uma interface HTML/CSS/JavaScript.
O chat não gera SQL e não usa dados mockados: cada pergunta suportada é
mapeada para uma consulta `SELECT` previamente cadastrada no backend.

## Configuração

Copie `.env.example` para `.env` e ajuste somente os segredos e endereços do
seu ambiente:

```env
APP_ENV=development
DATABASE_ENABLED=true
DATABASE_URL=postgresql://postgres:SUA_SENHA@localhost:5432/Primordial_Interno
DB_SCHEMA=ehr_teste
INTERNAL_API_KEY=substitua-por-um-segredo-com-32-caracteres
GROQ_API_KEY=gsk_substitua_por_um_segredo_real
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

O inicializador Python sobe Vite e FastAPI no mesmo terminal e encerra ambos
com o mesmo `Ctrl+C`. Use `--no-frontend` para iniciar somente o backend.

## Testar o banco

```powershell
Invoke-RestMethod http://127.0.0.1:8000/ready
```

Resposta esperada:

```json
{"status":"ready","database":"read_only"}
```

## Testar o chat

```powershell
$body = @{ pergunta = "Quantos pacientes existem?" } | ConvertTo-Json
Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/chat `
  -Method Post `
  -ContentType "application/json" `
  -Body $body
```

No banco de teste atual, a resposta confirmada é:

```json
{
  "pergunta": "Quantos pacientes existem?",
  "resposta": {
    "tipo": "total_pacientes",
    "mensagem": "Existem 70 pacientes cadastrados.",
    "dados": [{"total_pacientes": 70}],
    "sugestoes": []
  }
}
```

Perguntas cadastradas:

- Quantos pacientes existem?
- Quais pacientes têm doenças raras?
- Quais pacientes têm diabetes e usam insulina?
- Quais medicamentos estão em uso?
- Quais pacientes usam suplementos?
- Quais pacientes têm maior risco cardiometabólico?

Perguntas não cadastradas retornam `nao_entendido` e uma lista de sugestões.
Nenhum texto do usuário é concatenado ao SQL.

## Proteções do banco

- Pool assíncrono com `asyncpg`.
- Sessão e transação `read_only`.
- `search_path` definido pelo `DB_SCHEMA` validado.
- Somente consultas iniciadas por `SELECT` ou `WITH`.
- Bloqueio de `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`,
  `CREATE`, `GRANT` e `REVOKE`.
- Bloqueio de múltiplas instruções e comentários SQL.
- Consultas fixas no backend e limite máximo de 100 registros.
- Respostas e perguntas clínicas não são registradas nos logs.

Em desenvolvimento, `POST /chat` sem chave é aceito somente quando a conexão
HTTP vem do próprio computador (`127.0.0.1` ou `::1`). Em produção, o Backend
Java deve chamar ou publicar essa rota usando `X-Internal-API-Key`, autenticação
da clínica, RLS e auditoria.

## Conversa por voz efêmera

O React captura `WebM/Opus` com `MediaRecorder` e envia fragmentos binários
por `WebSocket` para `/voice/ws`. O FastAPI executa, nesta ordem:

1. decodificação PyAV e STT local em memória com faster-whisper/CTranslate2;
2. busca somente leitura no PostgreSQL;
3. pseudonimização reversível e efêmera do texto e do resultado;
4. verbalização factual com JSON estrito na Groq;
5. reidentificação dentro do serviço e TTS local em português com Piper;
6. retorno do WAV em fragmentos binários e limpeza dos buffers mutáveis.

O áudio bruto nunca é enviado à Groq. Somente a pergunta e os resultados já
pseudonimizados chegam ao LLM textual. Para ativar o recurso:

```env
VOICE_ENABLED=true
VOICE_STT_MODEL_PATH=./models/faster-whisper-base
VOICE_STT_DEVICE=cpu
VOICE_STT_COMPUTE_TYPE=int8
VOICE_TTS_MODEL_PATH=./models/pt_BR-faber-medium.onnx
VOICE_TTS_CONFIG_PATH=./models/pt_BR-faber-medium.onnx.json
```

Instale e baixe o modelo local uma única vez:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -c "from faster_whisper.utils import download_model; download_model('base', output_dir='models/faster-whisper-base')"
.\.venv\Scripts\python.exe -m piper.download_voices --data-dir models pt_BR-faber-medium
```

Áudio clínico nunca é escrito em arquivo, log ou PostgreSQL. Somente os modelos
locais públicos ficam persistidos e são montados como leitura no Docker. Em
produção, o navegador deve abrir o WebSocket pelo Backend Java autenticado; o
Java adiciona a chave interna no upgrade, aplica o escopo da clínica e a RLS.

Smoke test completo sem microfone e com uma frase sintética não clínica:

```powershell
.\.venv\Scripts\python.exe -m scripts.voice_smoke
```

## Docker

```powershell
docker compose up --build
```

Se o PostgreSQL estiver no Windows e o FastAPI estiver no Docker, substitua
`localhost` por `host.docker.internal` no `DATABASE_URL`.

## Testes automatizados

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Os testes verificam os contratos, as seis intenções, o bloqueio de SQL
destrutivo, a ocultação do `DATABASE_URL`, a API de IA pseudonimizada e a
remoção do bootstrap demonstrativo.
