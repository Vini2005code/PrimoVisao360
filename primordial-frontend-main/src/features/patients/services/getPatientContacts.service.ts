import { api } from "@/lib/api";
import type { PatientContactResponse } from "../types/patientContact.types";

export async function getPatientContacts(patientId: string) {
  const response = await api.get<PatientContactResponse[]>(
    `/patients/${patientId}/contacts`,
  );

  return response.data;
}
