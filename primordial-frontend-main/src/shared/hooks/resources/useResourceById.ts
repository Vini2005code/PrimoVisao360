import { useQuery } from "@tanstack/react-query";
import { getResourceById } from "@/shared/services/resources/resourceById.service";

type ResourceType = "municipality" | "nationality" | "occupation";

const endpointMap: Record<ResourceType, string> = {
  municipality: "/municipalities",
  nationality: "/nationalities",
  occupation: "/occupations",
};

export function useResourceById(type: ResourceType, id?: number) {
  return useQuery({
    queryKey: ["resource", type, id],
    queryFn: () => getResourceById(endpointMap[type], id as number),
    enabled: typeof id === "number" && !isNaN(id),
    staleTime: 1000 * 60 * 60 * 24,
  });
}
