import { api } from "@/lib/api";
import type {
  GetPatientsListParams,
  PageResponse,
  PatientResponse,
} from "../types/getPatientsList.types";

export async function getPatientsList({
  page = 0,
  size = 20,
}: GetPatientsListParams = {}): Promise<PageResponse<PatientResponse>> {
  const response = await api.get("/patients", {
    params: { page, size },
  });

  return response.data;
}
