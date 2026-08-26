import { useQuery } from "@tanstack/react-query";
import { getHealthInsuranceOperatorOptions } from "@/shared/services/resources";
import type { ResourceOption } from "@/shared/services/resources/types";

export function useHealthInsuranceOperator(query: string = "") {
  return useQuery<ResourceOption[]>({
    queryKey: ["healthInsuranceOperators", query],
    queryFn: () => getHealthInsuranceOperatorOptions(query),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
