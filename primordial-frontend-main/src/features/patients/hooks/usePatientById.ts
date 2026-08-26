import { useQuery } from "@tanstack/react-query";
import { getPatientById } from "../services/getPatientById.service";

export function usePatientById(id?: string) {
  return useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatientById(id as string),
    enabled: !!id,
  });
}
