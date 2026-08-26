import { api } from "@/lib/api";
import type { BulkCreatePatientHealthInsuranceRequest } from "../types/createPatientHealthInsurance.types";

export async function bulkCreatePatientHealthInsurances(
  patientId: string,
  payload: BulkCreatePatientHealthInsuranceRequest,
) {
  const response = await api.post(
    `/patients/${patientId}/health-insurances/bulk`,
    payload,
  );

  return response.data;
}
