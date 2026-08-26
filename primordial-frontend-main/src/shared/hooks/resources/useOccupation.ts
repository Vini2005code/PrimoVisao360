import { useQuery } from "@tanstack/react-query";
import { getOccupationOptions } from "@/shared/services/resources/occupation.service";
import type { ResourceOption } from "@/shared/services/resources/types";

export function useOccupation(query: string) {
  return useQuery<ResourceOption[]>({
    queryKey: ["occupations", query],
    queryFn: () => getOccupationOptions(query),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
