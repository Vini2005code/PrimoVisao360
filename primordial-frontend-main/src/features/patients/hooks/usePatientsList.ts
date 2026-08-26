import { useQuery } from "@tanstack/react-query";
import { getPatientsList } from "../services/getPatientsList.service";

export function usePatientsList(page = 0, size = 20) {
  return useQuery({
    queryKey: ["patients", page, size],
    queryFn: () => getPatientsList({ page, size }),
  });
}
