import { api } from "@/lib/api";
import type { MetadataApiResponse, MetadataOption } from "./types";

// busca metadados de qualquer endpoint
// Recebe o caminho da API
// Faz a requisição HTTP usando o api.ts
// Converte a resposta do backend (code, label)
// Para o formato padrão do frontend (value, label)
export async function getMetadataOptions(
  endpoint: string,
): Promise<MetadataOption[]> {
  const { data } = await api.get<MetadataApiResponse[]>(endpoint);

  return data.map(({ code, label }) => ({
    value: code,
    label,
  }));
}
