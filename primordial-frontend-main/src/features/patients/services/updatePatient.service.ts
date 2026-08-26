import { api } from "@/lib/api";
import type { CreatePatientRequest } from "../types/createPatient.types";

export async function updatePatient(
  patientId: string,
  payload: CreatePatientRequest,
) {
  const response = await api.patch(`/patients/${patientId}`, payload);
  return response.data;
}
