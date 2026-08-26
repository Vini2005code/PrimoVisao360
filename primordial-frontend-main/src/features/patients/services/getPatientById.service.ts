import { api } from "@/lib/api";

export async function getPatientById(id: string) {
  const response = await api.get(`/patients/${id}`);
  return response.data;
}
