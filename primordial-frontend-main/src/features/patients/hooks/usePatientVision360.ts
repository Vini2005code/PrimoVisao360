import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePatientVision360SavedItem,
  getPatientVision360Conversation,
  getPatientVision360SavedItems,
  savePatientVision360Item,
  sendPatientVision360Message,
} from "../services/patientVision360.service";
import type {
  PatientVision360Conversation,
  PatientVision360ChatScope,
  PatientVision360Message,
  PatientVision360SaveRequest,
  PatientVision360SavedItem,
} from "../types/patientVision360.types";

type UsePatientVision360Params = {
  patientId: string;
  clinicId: string;
};

export function usePatientVision360({
  patientId,
  clinicId,
}: UsePatientVision360Params) {
  const queryClient = useQueryClient();
  const isEnabled = Boolean(patientId && clinicId);
  const context = { clinicId };
  const conversationKey = ["patient", patientId, "vision-360", "chat"];
  const savedItemsKey = [
    "patient",
    patientId,
    "vision-360",
    "saved-items",
  ];

  const conversation = useQuery({
    queryKey: conversationKey,
    queryFn: () => getPatientVision360Conversation(patientId, context),
    enabled: isEnabled,
  });

  const savedItems = useQuery({
    queryKey: savedItemsKey,
    queryFn: () => getPatientVision360SavedItems(patientId, context),
    enabled: isEnabled,
  });

  const sendMessage = useMutation({
    mutationKey: ["patient", patientId, "vision-360", "send-message"],
    mutationFn: ({
      message,
      scope,
    }: {
      message: string;
      scope: PatientVision360ChatScope;
    }) => sendPatientVision360Message(patientId, context, message, scope),
    onSuccess: (response, variables) => {
      const userMessage: PatientVision360Message = {
        id: `local-${crypto.randomUUID()}`,
        role: "user",
        content: variables.message.trim(),
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<PatientVision360Conversation>(
        conversationKey,
        (current) => ({
          conversation_id:
            response.conversation_id ?? current?.conversation_id,
          messages: [
            ...(current?.messages ?? []),
            userMessage,
            response.assistant_message,
          ],
          updated_at: response.assistant_message.created_at,
        }),
      );
    },
  });

  const saveItem = useMutation({
    mutationKey: ["patient", patientId, "vision-360", "save-item"],
    mutationFn: (item: PatientVision360SaveRequest) =>
      savePatientVision360Item(patientId, context, item),
    onSuccess: (createdItem) => {
      queryClient.setQueryData<PatientVision360SavedItem[]>(
        savedItemsKey,
        (current) => [createdItem, ...(current ?? [])],
      );
    },
  });

  const deleteSavedItem = useMutation({
    mutationKey: ["patient", patientId, "vision-360", "delete-saved-item"],
    mutationFn: (savedItemId: string) =>
      deletePatientVision360SavedItem(patientId, context, savedItemId),
    onSuccess: (_, savedItemId) => {
      queryClient.setQueryData<PatientVision360SavedItem[]>(
        savedItemsKey,
        (current) => current?.filter((item) => item.id !== savedItemId) ?? [],
      );
    },
  });

  return {
    conversation,
    savedItems,
    sendMessage,
    saveItem,
    deleteSavedItem,
  };
}
