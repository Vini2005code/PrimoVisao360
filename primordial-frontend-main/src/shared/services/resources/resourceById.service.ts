import { api } from "@/lib/api";

export async function getResourceById<T>(
  endpoint: string,
  id: number,
): Promise<T> {
  const { data } = await api.get<T>(`${endpoint}/${id}`);
  return data;
}
