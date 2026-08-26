import { useQuery } from "@tanstack/react-query";
import { metadataRegistry } from "@/shared/services/metadata/registry";
import type {
  MetadataOption,
  MetadataKey,
} from "@/shared/services/metadata/types";

// Hook responsável por buscar e gerenciar metadados no React
// Recebe uma chave
// Usa o registry para encontrar a função correta de busca
// Utiliza React Query para: cachear os dados, controlar loading/error, evitar requisições desnecessárias
// Retorna automaticamente os dados no formato MetadataOption[]
export function useMetadata(key: MetadataKey) {
  return useQuery<MetadataOption[]>({
    queryKey: ["metadata", key],
    queryFn: metadataRegistry[key],
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
