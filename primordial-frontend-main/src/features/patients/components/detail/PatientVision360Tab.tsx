import {
  Bookmark,
  BookmarkCheck,
  Bot,
  Building2,
  ChartNoAxesCombined,
  Download,
  FileText,
  Loader2,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { lazy, Suspense, useState, type FormEvent } from "react";
import {
  showDeleteFeedback,
  showErrorFeedback,
  showSuccessFeedback,
} from "@/components/feedback/feedback";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/shared/utils/formatters/date";
import { usePatientVision360 } from "../../hooks/usePatientVision360";
import { exportPatientVision360Pdf } from "../../services/patientVision360Pdf.service";
import type {
  PatientVision360ChatScope,
  PatientVision360Message,
  PatientVision360SavedItem,
} from "../../types/patientVision360.types";
import VoiceConversationPanel from "./VoiceConversationPanel";

const PatientVision360ChartView = lazy(
  () => import("./PatientVision360Chart"),
);

const SUGGESTED_QUESTIONS: Record<PatientVision360ChatScope, string[]> = {
  clinic: [
    "Quantos pacientes estão cadastrados na clínica?",
    "Qual é a idade média dos pacientes?",
    "Quais são os diagnósticos mais comuns?",
  ],
  patient: [
    "Resuma os registros clínicos disponíveis.",
    "Mostre a evolução dos sinais vitais registrados.",
    "Organize os resultados de exames por período.",
  ],
};

type PatientVision360TabProps = {
  patientId: string;
  clinicId?: string | null;
  patientName: string;
};

type MessageBubbleProps = {
  message: PatientVision360Message;
  isSaved: boolean;
  isSaving: boolean;
  onSave: (message: PatientVision360Message) => void;
};

function ClinicalChart({
  chart,
}: {
  chart: NonNullable<PatientVision360Message["chart_data"]>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-80 items-center justify-center rounded-xl border bg-muted/30 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Carregando gráfico...
        </div>
      }
    >
      <PatientVision360ChartView chart={chart} />
    </Suspense>
  );
}

function MessageBubble({
  message,
  isSaved,
  isSaving,
  onSave,
}: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <article
      className={isAssistant ? "flex gap-3" : "flex justify-end gap-3"}
    >
      {isAssistant ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="size-4" />
        </div>
      ) : null}

      <div
        className={
          isAssistant
            ? "min-w-0 max-w-3xl space-y-3"
            : "min-w-0 max-w-2xl space-y-2"
        }
      >
        <div
          className={
            isAssistant
              ? "rounded-2xl rounded-tl-md border bg-card p-4 shadow-xs"
              : "rounded-2xl rounded-tr-md bg-primary px-4 py-3 text-primary-foreground"
          }
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.content}
          </p>
        </div>

        {message.chart_data ? (
          <ClinicalChart chart={message.chart_data} />
        ) : null}

        <div
          className={
            isAssistant
              ? "flex flex-wrap items-center gap-2"
              : "flex justify-end"
          }
        >
          <span className="text-xs text-muted-foreground">
            {formatDateTime(message.created_at)}
          </span>

          {isAssistant ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaved || isSaving}
              onClick={() => onSave(message)}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" />
              ) : isSaved ? (
                <BookmarkCheck />
              ) : (
                <Bookmark />
              )}
              {isSaved ? "Salvo" : "Salvar resposta"}
            </Button>
          ) : null}
        </div>
      </div>

      {!isAssistant ? (
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
          <UserRound className="size-4" />
        </div>
      ) : null}
    </article>
  );
}

type SavedItemCardProps = {
  item: PatientVision360SavedItem;
  isDeleting: boolean;
  onDelete: (itemId: string) => void;
};

function SavedItemCard({
  item,
  isDeleting,
  onDelete,
}: SavedItemCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir ${item.title}`}
            title="Excluir item salvo"
            disabled={isDeleting}
            onClick={() => onDelete(item.id)}
          >
            {isDeleting ? <Loader2 className="animate-spin" /> : <X />}
          </Button>
        </CardAction>
        <div className="flex min-w-0 items-center gap-2">
          {item.chart_data ? (
            <ChartNoAxesCombined className="size-5 shrink-0 text-primary" />
          ) : (
            <Bookmark className="size-5 shrink-0 text-primary" />
          )}
          <CardTitle className="truncate">{item.title}</CardTitle>
        </div>
        <CardDescription>
          Salvo em {formatDateTime(item.created_at)}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {item.content ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {item.content}
          </p>
        ) : null}
        {item.chart_data ? (
          <ClinicalChart chart={item.chart_data} />
        ) : null}
      </CardContent>

    </Card>
  );
}

export default function PatientVision360Tab({
  patientId,
  clinicId,
  patientName,
}: PatientVision360TabProps) {
  const [message, setMessage] = useState("");
  const [chatScope, setChatScope] =
    useState<PatientVision360ChatScope>("clinic");
  const [isExporting, setIsExporting] = useState(false);
  const vision360 = usePatientVision360({
    patientId,
    clinicId: clinicId ?? "",
  });

  if (!clinicId) {
    return (
      <ErrorState
        title="Contexto da clínica indisponível"
        description="Atualize a sessão antes de acessar o Primordial DATA. Nenhum dado clínico foi enviado."
        icon={<ShieldCheck />}
      />
    );
  }

  const messages = vision360.conversation.data?.messages ?? [];
  const savedItems = vision360.savedItems.data ?? [];
  const savedMessageIds = new Set(
    savedItems.map((item) => item.source_message_id),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const safeMessage = message.trim();

    if (!safeMessage || vision360.sendMessage.isPending) return;

    vision360.sendMessage.mutate({ message: safeMessage, scope: chatScope }, {
      onSuccess: () => setMessage(""),
      onError: () =>
        showErrorFeedback(
          "Não foi possível enviar a pergunta",
          "Tente novamente quando o serviço estiver disponível.",
        ),
    });
  }

  function handleSave(response: PatientVision360Message) {
    vision360.saveItem.mutate(
      {
        source_message_id: response.id,
        title:
          response.chart_data?.title ??
          response.content.slice(0, 80).trimEnd(),
        content: response.content,
        chart_data: response.chart_data,
      },
      {
        onSuccess: () =>
          showSuccessFeedback(
            "Resposta salva",
            "O conteúdo agora está disponível para a clínica.",
          ),
        onError: () =>
          showErrorFeedback(
            "Não foi possível salvar",
            "O conteúdo não foi adicionado aos salvamentos.",
          ),
      },
    );
  }

  function handleDelete(savedItemId: string) {
    vision360.deleteSavedItem.mutate(savedItemId, {
      onSuccess: () =>
        showDeleteFeedback(
          "Salvamento removido",
          "O item não será mais exibido para a clínica.",
        ),
      onError: () =>
        showErrorFeedback(
          "Não foi possível remover",
          "Tente novamente quando o serviço estiver disponível.",
        ),
    });
  }

  async function handleExportPdf() {
    if (!savedItems.length || isExporting) return;
    setIsExporting(true);
    try {
      const filename = await exportPatientVision360Pdf({
        patientName,
        generatedAt: new Date().toISOString(),
        items: savedItems,
      });
      showSuccessFeedback(
        "PDF gerado no dispositivo",
        `${filename} foi montado localmente e não foi enviado a terceiros.`,
      );
    } catch {
      showErrorFeedback(
        "Não foi possível gerar o PDF",
        "Os itens continuam salvos. Tente novamente neste dispositivo.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div>
              <CardTitle>Primordial DATA</CardTitle>
              <CardDescription className="mt-1">
                Inteligência clínica descritiva aplicada ao prontuário atual.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="sm:ml-auto">
              <ShieldCheck />
              Ambiente da clínica
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="chat">
        <TabsList className="grid w-full grid-cols-2 sm:w-fit">
          <TabsTrigger value="chat">
            <MessageCircle />
            Chat
          </TabsTrigger>
          <TabsTrigger value="saved">
            <Bookmark />
            Salvamentos
            {savedItems.length > 0 ? (
              <Badge variant="outline" className="ml-1">
                {savedItems.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
            <div>
              <p className="text-sm font-medium">Escopo da conversa</p>
              <p className="text-xs text-muted-foreground">
                Escolha quais registros autorizados serão consultados.
              </p>
            </div>
            <div className="flex rounded-lg border bg-muted/30 p-1" role="group" aria-label="Escopo da conversa">
              <Button
                type="button"
                size="sm"
                variant={chatScope === "clinic" ? "default" : "ghost"}
                onClick={() => setChatScope("clinic")}
              >
                <Building2 />
                Clínica
              </Button>
              <Button
                type="button"
                size="sm"
                variant={chatScope === "patient" ? "default" : "ghost"}
                onClick={() => setChatScope("patient")}
              >
                <UserRound />
                Paciente atual
              </Button>
            </div>
          </div>

          {chatScope === "patient" ? (
            <div className="mb-4">
              <VoiceConversationPanel clinicId={clinicId} patientId={patientId} />
            </div>
          ) : null}

          <Card className="overflow-hidden">
            <CardHeader className="border-b py-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="size-5 text-primary" />
                {chatScope === "clinic"
                  ? "Assistente populacional da clínica"
                  : "Assistente do paciente atual"}
              </CardTitle>
              <CardDescription>
                {chatScope === "clinic"
                  ? "Consulte somente estatísticas agregadas protegidas pelo isolamento da clínica. Frequência não representa gravidade clínica."
                  : "Consulte os registros autorizados deste paciente. As respostas são informativas e não indicam diagnóstico ou conduta."}
              </CardDescription>
            </CardHeader>

            <CardContent
              className="max-h-[58vh] min-h-96 space-y-6 overflow-y-auto bg-muted/20 py-6"
              aria-live="polite"
            >
              {vision360.conversation.isLoading ? (
                <LoadingState
                  title="Carregando a conversa"
                  description="Buscando o histórico autorizado deste paciente."
                />
              ) : null}

              {vision360.conversation.isError ? (
                <ErrorState
                  title="Não foi possível carregar o chat"
                  description="A conversa permanece protegida no backend. Tente novamente."
                  onRetry={() => vision360.conversation.refetch()}
                />
              ) : null}

              {!vision360.conversation.isLoading &&
              !vision360.conversation.isError &&
              messages.length === 0 ? (
                <EmptyState
                  title="Inicie uma consulta ao prontuário"
                  description="Faça uma pergunta objetiva ou escolha um exemplo descritivo."
                  icon={<Sparkles />}
                  action={
                    <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                      {SUGGESTED_QUESTIONS[chatScope].map((question) => (
                        <Button
                          key={question}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMessage(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  }
                />
              ) : null}

              {messages.map((chatMessage) => (
                <MessageBubble
                  key={chatMessage.id}
                  message={chatMessage}
                  isSaved={savedMessageIds.has(chatMessage.id)}
                  isSaving={
                    vision360.saveItem.isPending &&
                    vision360.saveItem.variables?.source_message_id ===
                      chatMessage.id
                  }
                  onSave={handleSave}
                />
              ))}

              {vision360.sendMessage.isPending ? (
                <>
                  <MessageBubble
                    message={{
                      id: "pending-user-message",
                      role: "user",
                      content: vision360.sendMessage.variables.message,
                      created_at: new Date().toISOString(),
                    }}
                    isSaved={false}
                    isSaving={false}
                    onSave={handleSave}
                  />
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Bot className="size-4" />
                    </div>
                    <Loader2 className="size-4 animate-spin" />
                    Analisando os registros autorizados...
                  </div>
                </>
              ) : null}
            </CardContent>

            <CardFooter className="border-t bg-card py-4">
              <form className="w-full space-y-3" onSubmit={handleSubmit}>
                <label htmlFor="vision-360-message" className="sr-only">
                  Pergunta para o assistente clínico
                </label>
                <Textarea
                  id="vision-360-message"
                  value={message}
                  maxLength={1_000}
                  rows={3}
                  disabled={vision360.sendMessage.isPending}
                  placeholder={
                    chatScope === "clinic"
                      ? "Pergunte sobre totais, idade média ou diagnósticos frequentes da clínica..."
                      : "Pergunte sobre os registros deste paciente..."
                  }
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Ctrl + Enter para enviar · {message.length}/1000
                  </p>
                  <Button
                    type="submit"
                    disabled={!message.trim() || vision360.sendMessage.isPending}
                  >
                    {vision360.sendMessage.isPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Send />
                    )}
                    Enviar pergunta
                  </Button>
                </div>
              </form>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <Card className="mb-4 border-primary/20 bg-gradient-to-r from-primary/[0.07] to-background">
            <CardHeader>
              <CardAction>
                <Button
                  type="button"
                  disabled={!savedItems.length || isExporting}
                  onClick={() => void handleExportPdf()}
                >
                  {isExporting ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Download />
                  )}
                  {isExporting ? "Montando PDF..." : "Exportar PDF"}
                </Button>
              </CardAction>
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <FileText className="size-5" />
                </div>
                <div>
                  <CardTitle>Itens Salvos</CardTitle>
                  <CardDescription className="mt-1">
                    {savedItems.length} {savedItems.length === 1 ? "item fixado" : "itens fixados"} para {patientName}.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2 border-t py-4 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              O relatório é processado em memória neste navegador. Nenhum dado do paciente é enviado a geradores de PDF externos.
            </CardContent>
          </Card>

          {vision360.savedItems.isLoading ? (
            <LoadingState
              title="Carregando salvamentos"
              description="Buscando respostas e gráficos fixados pela clínica."
            />
          ) : null}

          {vision360.savedItems.isError ? (
            <ErrorState
              title="Não foi possível carregar os salvamentos"
              description="Tente novamente quando o serviço estiver disponível."
              onRetry={() => vision360.savedItems.refetch()}
            />
          ) : null}

          {!vision360.savedItems.isLoading &&
          !vision360.savedItems.isError &&
          savedItems.length === 0 ? (
            <EmptyState
              title="Nenhum conteúdo salvo"
              description="Respostas e gráficos importantes fixados no chat aparecerão aqui para a clínica."
              icon={<Bookmark />}
            />
          ) : null}

          {savedItems.length > 0 ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {savedItems.map((item) => (
                <SavedItemCard
                  key={item.id}
                  item={item}
                  isDeleting={
                    vision360.deleteSavedItem.isPending &&
                    vision360.deleteSavedItem.variables === item.id
                  }
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          O contexto é limitado ao paciente e à clínica autenticada. O conteúdo
          é descritivo, permanece sujeito à revisão médica e não substitui a
          decisão profissional.
        </p>
      </div>
    </section>
  );
}
