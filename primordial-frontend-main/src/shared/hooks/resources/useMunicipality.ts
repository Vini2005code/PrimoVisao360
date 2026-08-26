import { useQuery } from "@tanstack/react-query";
import { getMunicipalityOptions } from "@/shared/services/resources";
import type { ResourceOption } from "@/shared/services/resources/types";

export function useMunicipality(query: string = "") {
  return useQuery<ResourceOption[]>({
    queryKey: ["municipalities", query],
    queryFn: () => getMunicipalityOptions(query),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
