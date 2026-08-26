import { api } from "@/lib/api";

// Função genérica apenas para requisição HTTP
// Não faz transformação, só retorna dados crus da API
export async function getResourceData<T>(
  endpoint: string,
  query: string,
): Promise<T[]> {
  const { data } = await api.get<T[]>(endpoint, {
    params: { query },
  });

  return data;
}
