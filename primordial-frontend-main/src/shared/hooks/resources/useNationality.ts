import { useQuery } from "@tanstack/react-query";
import { getNationalityOptions } from "@/shared/services/resources";
import type { ResourceOption } from "@/shared/services/resources/types";

export function useNationality(query: string = "") {
  return useQuery<ResourceOption[]>({
    queryKey: ["nationalities", query],
    queryFn: () => getNationalityOptions(query),
    enabled: query.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
