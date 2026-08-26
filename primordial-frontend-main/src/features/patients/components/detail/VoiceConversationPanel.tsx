import {
  AudioWaveform,
  CircleAlert,
  Loader2,
  Mic,
  ShieldCheck,
  Square,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useVoiceConversation } from "../../hooks/useVoiceConversation";
import type { VoiceUiState } from "../../types/patientVoice.types";

type VoiceConversationPanelProps = {
  clinicId?: string | null;
  patientId?: string | null;
};

const STATE_LABELS: Record<VoiceUiState, string> = {
  checking: "Verificando",
  unavailable: "Indisponível",
  idle: "Pronto para ouvir",
  requesting_permission: "Aguardando permissão",
  listening: "Ouvindo",
  processing: "Processando em segurança",
  speaking: "Respondendo",
  error: "Interrompido",
};

function VoiceLevel({ level, active }: { level: number; active: boolean }) {
  const multipliers = [0.35, 0.65, 1, 0.75, 0.45];
  return (
    <div
      className="flex h-9 items-center justify-center gap-1"
      aria-label={active ? "Nível do microfone" : "Microfone inativo"}
    >
      {multipliers.map((multiplier, index) => (
        <span
          key={index}
          className={cn(
            "w-1.5 rounded-full transition-[height,background-color] duration-100",
            active ? "bg-primary" : "bg-muted-foreground/30",
          )}
          style={{
            height: `${active ? 8 + Math.max(4, level * 28 * multiplier) : 8}px`,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceConversationPanel({
  clinicId,
  patientId,
}: VoiceConversationPanelProps) {
  const voice = useVoiceConversation({ clinicId, patientId });
  const isBusy = ["requesting_permission", "processing"].includes(voice.uiState);
  const isListening = voice.uiState === "listening";
  const isSpeaking = voice.uiState === "speaking";
  const isUnavailable = ["checking", "unavailable"].includes(voice.uiState);

  function handlePrimaryAction() {
    if (isListening) voice.stopCapture();
    else if (isSpeaking) voice.interrupt();
    else void voice.beginCapture();
  }

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.04]">
      <CardHeader className="border-b py-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <AudioWaveform className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>Conversa por voz</CardTitle>
            <CardDescription className="mt-1">
              Consulte os registros autorizados sem armazenar o áudio da conversa.
            </CardDescription>
          </div>
          <Badge
            variant={voice.uiState === "error" ? "destructive" : "secondary"}
            className="gap-1.5"
          >
            {isBusy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            {STATE_LABELS[voice.uiState]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5 py-6 lg:grid-cols-[230px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-background/80 p-5 text-center shadow-xs">
          <Button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isBusy || isUnavailable}
            className={cn(
              "size-24 rounded-full p-0 shadow-[0_0_0_10px_hsl(var(--primary)/0.10)]",
              isListening && "bg-destructive shadow-[0_0_0_10px_hsl(var(--destructive)/0.10)]",
              isSpeaking && "bg-accent text-accent-foreground shadow-[0_0_0_10px_hsl(var(--accent)/0.10)]",
            )}
            aria-label={
              isListening
                ? "Encerrar pergunta"
                : isSpeaking
                  ? "Interromper resposta"
                  : "Iniciar conversa por voz"
            }
          >
            {isBusy ? (
              <Loader2 className="size-9 animate-spin" />
            ) : isListening ? (
              <Square className="size-8 fill-current" />
            ) : isSpeaking ? (
              <Volume2 className="size-9" />
            ) : (
              <Mic className="size-9" />
            )}
          </Button>
          <VoiceLevel level={voice.level} active={isListening} />
          <p className="mt-1 text-sm font-medium">
            {isListening
              ? "Fale naturalmente"
              : isSpeaking
                ? "Toque para interromper"
                : "Toque para conversar"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A captura termina após uma pausa curta.
          </p>
        </div>

        <div className="min-w-0 space-y-4" aria-live="polite">
          {voice.error ? (
            <div className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{voice.error}</p>
            </div>
          ) : null}

          <div className="rounded-xl border bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Você perguntou
            </p>
            <p className="mt-2 min-h-6 whitespace-pre-wrap text-sm leading-6">
              {voice.transcript || "A transcrição efêmera aparecerá aqui durante esta sessão."}
            </p>
          </div>

          <div className="rounded-xl border bg-primary/[0.04] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Primordial DATA
            </p>
            <p className="mt-2 min-h-6 whitespace-pre-wrap text-sm leading-6">
              {voice.answer || "A resposta factual será reproduzida por voz e exibida neste espaço."}
            </p>
          </div>

          {voice.latency ? (
            <p className="text-xs text-muted-foreground">
              STT {voice.latency.stt} ms · consulta {voice.latency.query} ms · IA{" "}
              {voice.latency.llm} ms · voz {voice.latency.tts} ms
            </p>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-3 border-t bg-muted/20 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="voice-continuous"
            checked={voice.continuous}
            disabled={isUnavailable}
            onCheckedChange={(checked) => voice.setContinuous(checked === true)}
          />
          <Label htmlFor="voice-continuous" className="cursor-pointer text-sm">
            Continuar ouvindo após cada resposta
          </Label>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Áudio somente em memória · sem gravação no prontuário
        </div>
      </CardFooter>
    </Card>
  );
}
