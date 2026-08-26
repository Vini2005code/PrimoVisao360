# Modelo local de voz

Esta pasta recebe somente o modelo de síntese de voz (TTS). Ela nunca recebe
áudio de médicos ou pacientes.

Arquivos esperados no exemplo:

- `pt_BR-faber-medium.onnx`
- `pt_BR-faber-medium.onnx.json`
- `faster-whisper-base/` (STT local em português)

Para baixar a voz pública com o utilitário do Piper:

```powershell
.\.venv\Scripts\python.exe -m piper.download_voices pt_BR-faber-medium --data-dir models
```

Para baixar o STT convertido, uma única vez:

```powershell
.\.venv\Scripts\python.exe -c "from faster_whisper.utils import download_model; download_model('base', output_dir='models/faster-whisper-base')"
```

Em Docker, o diretório é montado em `/models` estritamente como leitura.
