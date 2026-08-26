import { api } from "@/lib/api";
import type {
  PatientVision360Conversation,
  PatientVision360Message,
  PatientVision360RequestContext,
  PatientVision360SaveRequest,
  PatientVision360SavedItem,
} from "../types/patientVision360.types";
import {
  patientVision360ConversationSchema,
  patientVision360EntityIdSchema,
  patientVision360PatientIdSchema,
  patientVision360MessageSchema,
  patientVision360RequestContextSchema,
  patientVision360SavedItemSchema,
  patientVision360SavedItemsSchema,
  patientVision360SaveRequestSchema,
  patientVision360SendMessageRequestSchema,
  patientVision360SendMessageResponseSchema,
} from "../types/patientVision360.types";
import {
  createSavedItemsScope,
  deleteLocalItem,
  getLocalSavedItems,
  saveLocalItem,
} from "./patientVision360.local.repository";

const IS_LOCAL_PREVIEW =
  import.meta.env.DEV && !import.meta.env.VITE_API_URL;

let localConversation: PatientVision360Conversation =
  patientVision360ConversationSchema.parse({
    conversation_id: "preview-conversation",
    updated_at: "2026-08-05T12:05:00-03:00",
    messages: [
      {
        id: "preview-welcome",
        role: "assistant",
        content:
          "Olá. Posso organizar os registros clínicos disponíveis, resumir períodos e apresentar evoluções em gráficos. Minhas respostas são exclusivamente descritivas.",
        created_at: "2026-08-05T12:00:00-03:00",
      },
      {
        id: "preview-user-chart",
        role: "user",
        content: "Mostre a evolução dos sinais vitais registrados.",
        created_at: "2026-08-05T12:04:00-03:00",
      },
      {
        id: "preview-assistant-chart",
        role: "assistant",
        content:
          "Demonstração visual com dados sintéticos: os registros foram organizados cronologicamente para facilitar a leitura da evolução documentada.",
        created_at: "2026-08-05T12:05:00-03:00",
        chart_data: {
          type: "line",
          title: "Evolução dos registros no período",
          labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
          values: [124, 128, 126, 121, 119, 122],
        },
      },
    ],
  });

const localSavedItemsSeed: PatientVision360SavedItem[] =
  patientVision360SavedItemsSchema.parse([
    {
      id: "preview-saved-chart",
      source_message_id: "preview-assistant-chart",
      title: "Evolução dos registros no período",
      content:
        "Demonstração visual com dados sintéticos: os registros foram organizados cronologicamente para facilitar a leitura da evolução documentada.",
      created_at: "2026-08-05T12:06:00-03:00",
      chart_data: {
        type: "line",
        title: "Evolução dos registros no período",
        labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
        values: [124, 128, 126, 121, 119, 122],
      },
    },
  ]);

function createLocalAssistantMessage(message: string): PatientVision360Message {
  const asksForChart = /gr[aá]fico|evolu[cç][aã]o|per[ií]odo/i.test(message);

  return patientVision360MessageSchema.parse({
    id: `preview-assistant-${crypto.randomUUID()}`,
    role: "assistant",
    content: asksForChart
      ? "Demonstração local: a resposta do Backend Java poderá combinar uma síntese factual com o gráfico validado abaixo."
      : "Demonstração local: quando o Backend Java estiver conectado, esta resposta será produzida a partir dos registros pseudonimizados do prontuário.",
    created_at: new Date().toISOString(),
    chart_data: asksForChart
      ? {
          type: "bar",
          title: "Distribuição demonstrativa dos registros",
          labels: ["Período 1", "Período 2", "Período 3", "Período 4"],
          values: [18, 24, 21, 29],
        }
      : undefined,
  });
}

function getPatientScope(
  patientId: string,
  context: PatientVision360RequestContext,
) {
  const safePatientId = patientVision360PatientIdSchema.parse(patientId);
  const safeContext = patientVision360RequestContextSchema.parse(context);

  return {
    patientId: encodeURIComponent(safePatientId),
    headers: {
      "X-Clinic-Id": safeContext.clinicId,
      "X-Request-ID": safeContext.requestId ?? crypto.randomUUID(),
    },
  };
}

export async function getPatientVision360Conversation(
  patientId: string,
  context: PatientVision360RequestContext,
) {
  const scope = getPatientScope(patientId, context);

  if (IS_LOCAL_PREVIEW) {
    return patientVision360ConversationSchema.parse(localConversation);
  }

  const response = await api.get<unknown>(
    `/patients/${scope.patientId}/vision-360/chat`,
    { headers: scope.headers },
  );

  return patientVision360ConversationSchema.parse(response.data);
}

export async function sendPatientVision360Message(
  patientId: string,
  context: PatientVision360RequestContext,
  message: string,
) {
  const scope = getPatientScope(patientId, context);
  const payload = patientVision360SendMessageRequestSchema.parse({ message });

  if (IS_LOCAL_PREVIEW) {
    const userMessage = patientVision360MessageSchema.parse({
      id: `preview-user-${crypto.randomUUID()}`,
      role: "user",
      content: payload.message,
      created_at: new Date().toISOString(),
    });
    const assistantMessage = createLocalAssistantMessage(payload.message);

    localConversation = patientVision360ConversationSchema.parse({
      conversation_id: localConversation.conversation_id,
      messages: [
        ...localConversation.messages,
        userMessage,
        assistantMessage,
      ],
      updated_at: assistantMessage.created_at,
    });

    return patientVision360SendMessageResponseSchema.parse({
      conversation_id: localConversation.conversation_id,
      assistant_message: assistantMessage,
      cached: false,
      status_processamento: "sucesso",
    });
  }

  const response = await api.post<unknown>(
    `/patients/${scope.patientId}/vision-360/chat/messages`,
    payload,
    { headers: scope.headers },
  );

  return patientVision360SendMessageResponseSchema.parse(response.data);
}

export async function getPatientVision360SavedItems(
  patientId: string,
  context: PatientVision360RequestContext,
) {
  const scope = getPatientScope(patientId, context);

  if (IS_LOCAL_PREVIEW) {
    return await getLocalSavedItems(
      createSavedItemsScope(context.clinicId, patientId),
      localSavedItemsSeed,
    );
  }

  const response = await api.get<unknown>(
    `/patients/${scope.patientId}/vision-360/saved-items`,
    { headers: scope.headers },
  );

  return patientVision360SavedItemsSchema.parse(response.data);
}

export async function savePatientVision360Item(
  patientId: string,
  context: PatientVision360RequestContext,
  item: PatientVision360SaveRequest,
) {
  const scope = getPatientScope(patientId, context);
  const payload = patientVision360SaveRequestSchema.parse(item);

  if (IS_LOCAL_PREVIEW) {
    const createdItem = patientVision360SavedItemSchema.parse({
      ...payload,
      id: `preview-saved-${crypto.randomUUID()}`,
      created_at: new Date().toISOString(),
    });
    return await saveLocalItem(
      createSavedItemsScope(context.clinicId, patientId),
      createdItem,
    );
  }

  const response = await api.post<unknown>(
    `/patients/${scope.patientId}/vision-360/saved-items`,
    payload,
    { headers: scope.headers },
  );

  return patientVision360SavedItemSchema.parse(response.data);
}

export async function deletePatientVision360SavedItem(
  patientId: string,
  context: PatientVision360RequestContext,
  savedItemId: string,
) {
  const scope = getPatientScope(patientId, context);
  const safeSavedItemId = patientVision360EntityIdSchema.parse(savedItemId);

  if (IS_LOCAL_PREVIEW) {
    await deleteLocalItem(
      createSavedItemsScope(context.clinicId, patientId),
      safeSavedItemId,
    );
    return;
  }

  await api.delete(
    `/patients/${scope.patientId}/vision-360/saved-items/${encodeURIComponent(safeSavedItemId)}`,
    { headers: scope.headers },
  );
}
