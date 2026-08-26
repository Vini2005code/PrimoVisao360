import { api } from "@/lib/api";
import type { BulkCreatePatientContactRequest } from "../types/createPatientContact.types";

export async function bulkCreatePatientContacts(
  patientId: string,
  payload: BulkCreatePatientContactRequest,
) {
  const response = await api.post(
    `/patients/${patientId}/contacts/bulk`,
    payload,
  );

  return response.data;
}
