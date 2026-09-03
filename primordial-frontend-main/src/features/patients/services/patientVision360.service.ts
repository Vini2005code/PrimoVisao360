import { api } from "@/lib/api";
import { z } from "zod";
import type {
  PatientVision360Conversation,
  PatientVision360ChatScope,
  PatientVision360RequestContext,
  PatientVision360SaveRequest,
  PatientVision360SavedItem,
} from "../types/patientVision360.types";
import {
  patientVision360ConversationSchema,
  patientVision360ChatScopeSchema,
  patientVision360EntityIdSchema,
  patientVision360PatientIdSchema,
  patientVision360RequestContextSchema,
  patientVision360SavedItemSchema,
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

const javaChatResponseSchema = z
  .object({
    resposta: z.string().trim().min(1).max(8_000),
    status_processamento: z.literal("sucesso"),
  })
  .strict();

let localConversation: PatientVision360Conversation =
  patientVision360ConversationSchema.parse({
    conversation_id: "current-session",
    updated_at: new Date().toISOString(),
    messages: [
      {
        id: "session-welcome",
        role: "assistant",
        content:
          "Olá. Posso organizar os registros clínicos disponíveis, resumir períodos e apresentar evoluções em gráficos. Minhas respostas são exclusivamente descritivas.",
        created_at: new Date().toISOString(),
      },
    ],
  });

const localSavedItemsSeed: PatientVision360SavedItem[] = [];

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
  getPatientScope(patientId, context);
  return patientVision360ConversationSchema.parse(localConversation);
}

export async function sendPatientVision360Message(
  patientId: string,
  context: PatientVision360RequestContext,
  message: string,
  chatScope: PatientVision360ChatScope,
) {
  const scope = getPatientScope(patientId, context);
  const payload = patientVision360SendMessageRequestSchema.parse({ message });
  const safeChatScope = patientVision360ChatScopeSchema.parse(chatScope);
  const endpoint =
    safeChatScope === "clinic"
      ? "/chat/populacional"
      : `/pacientes/${scope.patientId}/chat`;

  const response = await api.post<unknown>(
    endpoint,
    { pergunta: payload.message },
    { headers: scope.headers },
  );
  const javaResponse = javaChatResponseSchema.parse(response.data);
  return patientVision360SendMessageResponseSchema.parse({
    conversation_id: localConversation.conversation_id,
    assistant_message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: javaResponse.resposta,
      created_at: new Date().toISOString(),
    },
    cached: false,
    status_processamento: javaResponse.status_processamento,
  });
}

export async function getPatientVision360SavedItems(
  patientId: string,
  context: PatientVision360RequestContext,
) {
  getPatientScope(patientId, context);
  const items = await getLocalSavedItems(
    createSavedItemsScope(context.clinicId, patientId),
    localSavedItemsSeed,
  );
  return items.filter((item) => !item.id.startsWith("preview-"));
}

export async function savePatientVision360Item(
  patientId: string,
  context: PatientVision360RequestContext,
  item: PatientVision360SaveRequest,
) {
  getPatientScope(patientId, context);
  const payload = patientVision360SaveRequestSchema.parse(item);
  const createdItem = patientVision360SavedItemSchema.parse({
    ...payload,
    id: `saved-${crypto.randomUUID()}`,
    created_at: new Date().toISOString(),
  });
  return await saveLocalItem(
    createSavedItemsScope(context.clinicId, patientId),
    createdItem,
  );
}

export async function deletePatientVision360SavedItem(
  patientId: string,
  context: PatientVision360RequestContext,
  savedItemId: string,
) {
  getPatientScope(patientId, context);
  const safeSavedItemId = patientVision360EntityIdSchema.parse(savedItemId);
  await deleteLocalItem(
    createSavedItemsScope(context.clinicId, patientId),
    safeSavedItemId,
  );
}
