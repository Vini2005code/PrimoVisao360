import { api } from "@/lib/api";
import type { PatientHealthInsuranceResponse } from "../types/patientHealthInsurance.types";

export async function getPatientHealthInsurances(patientId: string) {
  const response = await api.get<PatientHealthInsuranceResponse[]>(
    `/patients/${patientId}/health-insurances`,
  );

  return response.data;
}
