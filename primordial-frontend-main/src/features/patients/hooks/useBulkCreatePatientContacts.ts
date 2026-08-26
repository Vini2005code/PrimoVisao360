import { useMutation } from "@tanstack/react-query";
import { bulkCreatePatientContacts } from "../services/bulkCreatePatientContacts.service";
import type { BulkCreatePatientContactRequest } from "../types/createPatientContact.types";

type MutationParams = {
  patientId: string;
  payload: BulkCreatePatientContactRequest;
};

export function useBulkCreatePatientContacts() {
  return useMutation({
    mutationFn: ({ patientId, payload }: MutationParams) =>
      bulkCreatePatientContacts(patientId, payload),
  });
}
