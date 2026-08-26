import { api } from "@/lib/api";
import type { CreatePatientRequest } from "../types/createPatient.types";

export type CreatePatientResponse = {
  id: string;
};

export async function createPatient(
  payload: CreatePatientRequest,
): Promise<CreatePatientResponse> {
  const response = await api.post("/patients", payload);
  return response.data;
}
